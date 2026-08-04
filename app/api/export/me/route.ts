import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ensureParticipant, listGames } from "@/lib/data";
import { pickLabel } from "@/lib/format";
import { getD1 } from "@/lib/runtime";
import type { PickSelection } from "@/lib/types";

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const participant = await ensureParticipant(user.email, user.displayName);
    if (!participant) throw new Error("Could not load participant");
    const games = await listGames();
    const picksResult = await getD1()
      .prepare("SELECT game_id, selection FROM picks WHERE participant_id = ?1")
      .bind(participant.id)
      .all<{ game_id: string; selection: PickSelection }>();
    const picks = new Map(picksResult.results.map((row) => [row.game_id, row.selection]));
    const columns = ["Participant", "Email", "Week", "Start Time", "Away", "Home", "Pick"];
    const body = [
      columns.map(csvValue).join(","),
      ...games.map((game) => [
        participant.display_name,
        participant.email,
        game.week,
        game.startTime,
        game.awayTeam,
        game.homeTeam,
        pickLabel(game, picks.get(game.id)),
      ].map(csvValue).join(",")),
    ].join("\r\n");
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="my-sec-pickem-2026.csv"',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not export your picks" },
      { status: 500 },
    );
  }
}
