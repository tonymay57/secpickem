import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isAdminEmail } from "@/lib/authz";
import { PICKS_LOCK_AT } from "@/lib/constants";
import { ensureParticipant, listGames, getStandings } from "@/lib/data";
import { syncSecGames } from "@/lib/espn";
import { getD1 } from "@/lib/runtime";
import type { PickSelection } from "@/lib/types";

export const dynamic = "force-dynamic";

type TeamTally = { wins: number; losses: number };

async function viewerForRequest() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const viewer = await ensureParticipant(user.email, user.displayName);
  return viewer ? { user, viewer, admin: isAdminEmail(user.email) } : null;
}

function canViewLedger(identity: NonNullable<Awaited<ReturnType<typeof viewerForRequest>>>) {
  if (identity.admin) return null;
  if (Date.now() < new Date(PICKS_LOCK_AT).getTime()) {
    return "Everyone’s picks open after the September 3 kickoff deadline.";
  }
  if (!identity.viewer.paid || !identity.viewer.submitted_at) {
    return "Submit your ballot and wait for payment verification to view everyone’s picks.";
  }
  return null;
}

export async function GET() {
  try {
    const identity = await viewerForRequest();
    if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const accessError = canViewLedger(identity);
    if (accessError) return Response.json({ error: accessError }, { status: 403 });
    let games = await listGames();
    if (!games.length) {
      await syncSecGames();
      games = await listGames();
    }
    const participantsResult = await getD1()
      .prepare(
        `SELECT id, display_name FROM participants
         WHERE paid = 1 AND submitted_at IS NOT NULL
         ORDER BY display_name COLLATE NOCASE`,
      )
      .all<{ id: number; display_name: string }>();
    const picksResult = await getD1()
      .prepare("SELECT participant_id, game_id, selection FROM picks")
      .all<{ participant_id: number; game_id: string; selection: PickSelection }>();
    const picksByParticipant = new Map<number, Record<string, PickSelection>>();
    for (const pick of picksResult.results) {
      const selections = picksByParticipant.get(pick.participant_id) ?? {};
      selections[pick.game_id] = pick.selection;
      picksByParticipant.set(pick.participant_id, selections);
    }
    const participants = participantsResult.results.map((participant) => ({
      id: participant.id,
      displayName: participant.display_name,
      picks: picksByParticipant.get(participant.id) ?? {},
    }));
    const eligibleIds = new Set(participants.map((participant) => participant.id));
    const pickTotals = Object.fromEntries(
      games.map((game) => [
        game.id,
        {
          away: { wins: 0, losses: 0 } satisfies TeamTally,
          home: { wins: 0, losses: 0 } satisfies TeamTally,
        },
      ]),
    );
    for (const pick of picksResult.results) {
      if (!eligibleIds.has(pick.participant_id)) continue;
      const tally = pickTotals[pick.game_id];
      if (!tally) continue;
      if (pick.selection === "away") {
        tally.away.wins += 1;
        tally.home.losses += 1;
      } else if (pick.selection === "home") {
        tally.home.wins += 1;
        tally.away.losses += 1;
      } else {
        tally.away.wins += 1;
        tally.away.losses += 1;
        tally.home.wins += 1;
        tally.home.losses += 1;
      }
    }
    const favoritesResult = await getD1()
      .prepare(
        "SELECT favorite_participant_id FROM participant_favorites WHERE participant_id = ?1",
      )
      .bind(identity.viewer.id)
      .all<{ favorite_participant_id: number }>();
    return Response.json({
      games,
      participants,
      standings: await getStandings(),
      favoriteIds: favoritesResult.results.map((row) => row.favorite_participant_id),
      pickTotals,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load public picks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const identity = await viewerForRequest();
    if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const accessError = canViewLedger(identity);
    if (accessError) return Response.json({ error: accessError }, { status: 403 });
    const body = (await request.json()) as {
      favoriteParticipantId?: number;
      favorite?: boolean;
    };
    const favoriteParticipantId = Number(body.favoriteParticipantId);
    if (!Number.isInteger(favoriteParticipantId) || favoriteParticipantId < 1) {
      return Response.json({ error: "Choose a valid contestant." }, { status: 400 });
    }
    const target = await getD1()
      .prepare(
        "SELECT id FROM participants WHERE id = ?1 AND paid = 1 AND submitted_at IS NOT NULL",
      )
      .bind(favoriteParticipantId)
      .first<{ id: number }>();
    if (!target) return Response.json({ error: "Contestant not found." }, { status: 404 });

    if (body.favorite) {
      await getD1()
        .prepare(
          `INSERT OR IGNORE INTO participant_favorites (participant_id, favorite_participant_id)
           VALUES (?1, ?2)`,
        )
        .bind(identity.viewer.id, favoriteParticipantId)
        .run();
    } else {
      await getD1()
        .prepare(
          `DELETE FROM participant_favorites
           WHERE participant_id = ?1 AND favorite_participant_id = ?2`,
        )
        .bind(identity.viewer.id, favoriteParticipantId)
        .run();
    }
    return Response.json({ ok: true, favoriteParticipantId, favorite: Boolean(body.favorite) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update favorites" },
      { status: 500 },
    );
  }
}
