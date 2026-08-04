import { getChatGPTUser } from "@/app/chatgpt-auth";
import { PICKS_LOCK_AT } from "@/lib/constants";
import { ensureParticipant, listGames } from "@/lib/data";
import { getD1, runtimeEnv } from "@/lib/runtime";
import type { PickSelection } from "@/lib/types";

export const dynamic = "force-dynamic";

async function participantForRequest() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const participant = await ensureParticipant(user.email, user.displayName);
  return participant ? { user, participant } : null;
}

export async function GET() {
  try {
    const identity = await participantForRequest();
    if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const games = await listGames();
    const picksResult = await getD1()
      .prepare("SELECT game_id, selection FROM picks WHERE participant_id = ?1")
      .bind(identity.participant.id)
      .all<{ game_id: string; selection: PickSelection }>();
    const lastChange = await getD1()
      .prepare("SELECT MAX(updated_at) AS updated_at FROM picks WHERE participant_id = ?1")
      .bind(identity.participant.id)
      .first<{ updated_at: string | null }>();
    return Response.json({
      games,
      picks: Object.fromEntries(picksResult.results.map((row) => [row.game_id, row.selection])),
      participant: {
        displayName: identity.participant.display_name,
        email: identity.participant.email,
        phone: identity.participant.phone ?? "",
        tiebreaker: identity.participant.tiebreaker,
        submittedAt: identity.participant.submitted_at,
        paymentClaimedAt: identity.participant.payment_claimed_at,
        paid: Boolean(identity.participant.paid),
        lastPickUpdatedAt: lastChange?.updated_at ?? null,
      },
      payment: {
        entryFee: Number(runtimeEnv().ENTRY_FEE ?? "20"),
        venmoHandle: runtimeEnv().VENMO_HANDLE ?? "",
        paypalAccount: runtimeEnv().PAYPAL_ACCOUNT ?? "",
      },
      locked: Date.now() >= new Date(PICKS_LOCK_AT).getTime(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load ballot summary" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const identity = await participantForRequest();
    if (!identity) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const body = (await request.json()) as {
      action?: "profile" | "submit" | "claim-payment";
      displayName?: string;
      phone?: string;
      tiebreaker?: number | string | null;
    };
    const db = getD1();

    if (body.action === "profile") {
      const displayName = (body.displayName ?? "").trim().slice(0, 80);
      const phone = (body.phone ?? "").trim().slice(0, 40);
      const parsed = body.tiebreaker === "" || body.tiebreaker === null
        ? null
        : Number(body.tiebreaker);
      if (!displayName) return Response.json({ error: "Your display name is required." }, { status: 400 });
      if (parsed !== null && (!Number.isInteger(parsed) || parsed < 0 || parsed > 200)) {
        return Response.json({ error: "Enter a tiebreaker from 0 to 200." }, { status: 400 });
      }
      await db
        .prepare(
          `UPDATE participants
           SET display_name = ?1, phone = ?2, tiebreaker = ?3, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?4`,
        )
        .bind(displayName, phone || null, parsed, identity.participant.id)
        .run();
      return Response.json({ ok: true });
    }

    if (body.action === "submit") {
      if (Date.now() >= new Date(PICKS_LOCK_AT).getTime()) {
        return Response.json({ error: "The season ballot is locked." }, { status: 403 });
      }
      const games = await listGames();
      const count = await db
        .prepare("SELECT COUNT(*) AS count FROM picks WHERE participant_id = ?1")
        .bind(identity.participant.id)
        .first<{ count: number }>();
      const refreshed = await db
        .prepare("SELECT tiebreaker FROM participants WHERE id = ?1")
        .bind(identity.participant.id)
        .first<{ tiebreaker: number | null }>();
      if (Number(count?.count ?? 0) !== games.length) {
        return Response.json(
          { error: `Complete all ${games.length} game selections before submitting.` },
          { status: 400 },
        );
      }
      if (refreshed?.tiebreaker === null || refreshed?.tiebreaker === undefined) {
        return Response.json({ error: "Save your SEC Championship tiebreaker first." }, { status: 400 });
      }
      await db
        .prepare(
          `UPDATE participants
           SET submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
           WHERE id = ?1`,
        )
        .bind(identity.participant.id)
        .run();
      return Response.json({ ok: true, submittedAt: new Date().toISOString() });
    }

    if (body.action === "claim-payment") {
      await db
        .prepare(
          `UPDATE participants
           SET payment_claimed_at = COALESCE(payment_claimed_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
           WHERE id = ?1`,
        )
        .bind(identity.participant.id)
        .run();
      return Response.json({ ok: true, paymentClaimedAt: new Date().toISOString() });
    }

    return Response.json({ error: "Unknown ballot action." }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update ballot" },
      { status: 500 },
    );
  }
}
