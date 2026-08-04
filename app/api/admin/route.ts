import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isAdminEmail } from "@/lib/authz";
import { ensureSchema } from "@/lib/data";
import { getD1 } from "@/lib/runtime";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getChatGPTUser();
  return user && isAdminEmail(user.email) ? user : null;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return Response.json({ error: "Commissioner access is required." }, { status: 403 });
    await ensureSchema();
    const db = getD1();
    const participants = await db
      .prepare(
        `SELECT p.id, p.display_name, p.email, p.phone, p.tiebreaker, p.submitted_at,
                p.payment_claimed_at, p.paid, p.payment_verified_at, p.payment_note,
                COUNT(pk.game_id) AS pick_count
         FROM participants p
         LEFT JOIN picks pk ON pk.participant_id = p.id
         GROUP BY p.id
         ORDER BY p.display_name COLLATE NOCASE`,
      )
      .all<Record<string, unknown>>();
    const posts = await db
      .prepare(
        `SELECT mp.id, mp.body, mp.created_at, p.display_name
         FROM message_posts mp
         JOIN participants p ON p.id = mp.participant_id
         WHERE mp.deleted_at IS NULL
         ORDER BY mp.created_at DESC, mp.id DESC
         LIMIT 100`,
      )
      .all<Record<string, unknown>>();
    return Response.json({ participants: participants.results, posts: posts.results });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load commissioner dashboard" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return Response.json({ error: "Commissioner access is required." }, { status: 403 });
    const body = (await request.json()) as {
      action?: "payment" | "delete-post";
      participantId?: number;
      paid?: boolean;
      note?: string;
      postId?: number;
    };
    const db = getD1();
    if (body.action === "payment" && Number.isInteger(body.participantId)) {
      await db
        .prepare(
          `UPDATE participants
           SET paid = ?1,
               payment_verified_at = CASE WHEN ?1 = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
               payment_verified_by = CASE WHEN ?1 = 1 THEN ?2 ELSE NULL END,
               payment_note = ?3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?4`,
        )
        .bind(body.paid ? 1 : 0, admin.email, (body.note ?? "").trim().slice(0, 160) || null, body.participantId)
        .run();
      return Response.json({ ok: true });
    }
    if (body.action === "delete-post" && Number.isInteger(body.postId)) {
      await db
        .prepare(
          `UPDATE message_posts SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?1 WHERE id = ?2`,
        )
        .bind(admin.email, body.postId)
        .run();
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown commissioner action." }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not update commissioner records" },
      { status: 500 },
    );
  }
}
