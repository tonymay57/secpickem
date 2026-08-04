import { getChatGPTUser } from "@/app/chatgpt-auth";
import { isAdminEmail } from "@/lib/authz";
import { ensureSchema } from "@/lib/data";
import { getD1 } from "@/lib/runtime";

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user || !isAdminEmail(user.email)) {
      return Response.json({ error: "Commissioner access is required." }, { status: 403 });
    }
    await ensureSchema();
    const result = await getD1()
      .prepare(
        `SELECT p.display_name, p.email, p.phone, p.tiebreaker, p.submitted_at,
                p.payment_claimed_at, p.paid, p.payment_verified_at,
                g.week, g.start_time, g.away_team, g.home_team,
                CASE pk.selection
                  WHEN 'home' THEN g.home_team
                  WHEN 'away' THEN g.away_team
                  WHEN 'split' THEN 'Split (1-1)'
                  ELSE ''
                END AS pick,
                pk.points,
                g.completed,
                g.winner_team
         FROM participants p
         CROSS JOIN games g
         LEFT JOIN picks pk ON pk.participant_id = p.id AND pk.game_id = g.id
         ORDER BY p.display_name COLLATE NOCASE, g.week, g.start_time`,
      )
      .all<Record<string, unknown>>();
    const columns = [
      "Participant",
      "Email",
      "Phone",
      "Tiebreaker",
      "Submitted At",
      "Payment Claimed At",
      "Payment Verified",
      "Payment Verified At",
      "Week",
      "Start Time",
      "Away Team",
      "Home Team",
      "Pick",
      "Points",
      "Completed",
      "Winner",
    ];
    const body = [
      columns.map(csvValue).join(","),
      ...result.results.map((row) =>
        [
          row.display_name,
          row.email,
          row.phone,
          row.tiebreaker,
          row.submitted_at,
          row.payment_claimed_at,
          row.paid,
          row.payment_verified_at,
          row.week,
          row.start_time,
          row.away_team,
          row.home_team,
          row.pick,
          row.points,
          row.completed,
          row.winner_team,
        ].map(csvValue).join(","),
      ),
    ].join("\r\n");
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="sec-pickem-2026.csv"',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not export picks" },
      { status: 500 },
    );
  }
}
