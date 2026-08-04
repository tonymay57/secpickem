import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensureParticipant } from "@/lib/data";
import { getD1 } from "@/lib/runtime";

export const dynamic = "force-dynamic";

async function authorizedParticipant() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const participant = await ensureParticipant(user.email, user.displayName);
  if (!participant?.paid || !participant.submitted_at) return null;
  return participant;
}

export async function GET() {
  try {
    const participant = await authorizedParticipant();
    if (!participant) {
      return Response.json(
        { error: "The message board opens after your ballot is submitted and payment is verified." },
        { status: 403 },
      );
    }
    const posts = await getD1()
      .prepare(
        `SELECT mp.id, mp.body, mp.created_at, p.display_name
         FROM message_posts mp
         JOIN participants p ON p.id = mp.participant_id
         WHERE mp.deleted_at IS NULL
         ORDER BY mp.created_at DESC, mp.id DESC
         LIMIT 200`,
      )
      .all<{ id: number; body: string; created_at: string; display_name: string }>();
    return Response.json({
      posts: posts.results.map((post) => ({
        id: post.id,
        body: post.body,
        createdAt: post.created_at,
        displayName: post.display_name,
      })),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load the message board" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const participant = await authorizedParticipant();
    if (!participant) {
      return Response.json(
        { error: "Submit your ballot and wait for payment verification before posting." },
        { status: 403 },
      );
    }
    const body = (await request.json()) as { body?: string };
    const message = (body.body ?? "").trim();
    if (message.length < 2 || message.length > 1200) {
      return Response.json({ error: "Messages must be between 2 and 1,200 characters." }, { status: 400 });
    }
    const result = await getD1()
      .prepare("INSERT INTO message_posts (participant_id, body) VALUES (?1, ?2)")
      .bind(participant.id, message)
      .run();
    return Response.json({ ok: true, id: result.meta.last_row_id });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not post message" },
      { status: 500 },
    );
  }
}
