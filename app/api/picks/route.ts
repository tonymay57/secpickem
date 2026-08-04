import { getChatGPTUser } from "@/app/chatgpt-auth";
import { PICKS_LOCK_AT } from "@/lib/constants";
import { ensureParticipant, listGames } from "@/lib/data";
import { syncSecGames } from "@/lib/espn";
import { getD1 } from "@/lib/runtime";
import type { PickSelection } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadGames() {
  let games = await listGames();
  if (games.length === 0) {
    await syncSecGames();
    games = await listGames();
  }
  return games;
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const participant = await ensureParticipant(user.email, user.displayName);
    if (!participant) throw new Error("Could not create participant record");
    const games = await loadGames();
    const result = await getD1()
      .prepare("SELECT game_id, selection FROM picks WHERE participant_id = ?1")
      .bind(participant.id)
      .all<{ game_id: string; selection: PickSelection }>();
    const lastChange = await getD1()
      .prepare("SELECT MAX(updated_at) AS updated_at FROM picks WHERE participant_id = ?1")
      .bind(participant.id)
      .first<{ updated_at: string | null }>();
    const picks = Object.fromEntries(
      result.results.map((row) => [row.game_id, row.selection]),
    );
    return Response.json({
      games,
      picks,
      locked: Date.now() >= new Date(PICKS_LOCK_AT).getTime(),
      participant: {
        displayName: participant.display_name,
        paid: Boolean(participant.paid),
        submittedAt: participant.submitted_at,
        lastPickUpdatedAt: lastChange?.updated_at ?? null,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load picks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    if (Date.now() >= new Date(PICKS_LOCK_AT).getTime()) {
      return Response.json({ error: "The season ballot is locked." }, { status: 403 });
    }

    const body = (await request.json()) as {
      gameId?: string;
      selection?: PickSelection;
    };
    if (!body.gameId || !["home", "away", "split"].includes(body.selection ?? "")) {
      return Response.json({ error: "A valid game and selection are required." }, { status: 400 });
    }
    const selection = body.selection as PickSelection;
    const participant = await ensureParticipant(user.email, user.displayName);
    if (!participant) throw new Error("Could not create participant record");
    const game = await getD1()
      .prepare(
        `SELECT id, home_team, away_team, home_sec, away_sec
         FROM games WHERE id = ?1`,
      )
      .bind(body.gameId)
      .first<{
        id: string;
        home_team: string;
        away_team: string;
        home_sec: number;
        away_sec: number;
      }>();
    if (!game) return Response.json({ error: "Game not found." }, { status: 404 });
    if (selection === "split" && !(game.home_sec && game.away_sec)) {
      return Response.json(
        { error: "Split is only available for SEC-vs-SEC games." },
        { status: 400 },
      );
    }
    const selectedTeam =
      selection === "home" ? game.home_team : selection === "away" ? game.away_team : null;

    await getD1()
      .prepare(
        `INSERT INTO picks (
           participant_id, game_id, selection, selected_team, points, updated_at
         ) VALUES (?1, ?2, ?3, ?4, NULL, CURRENT_TIMESTAMP)
         ON CONFLICT(participant_id, game_id) DO UPDATE SET
           selection = excluded.selection,
           selected_team = excluded.selected_team,
           points = NULL,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(participant.id, body.gameId, selection, selectedTeam)
      .run();

    return Response.json({ ok: true, gameId: body.gameId, selection });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not save pick" },
      { status: 500 },
    );
  }
}
