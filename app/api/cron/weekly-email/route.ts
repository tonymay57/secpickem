import { isAuthorizedCron } from "@/lib/cron";
import { getStandings } from "@/lib/data";
import { getD1, runtimeEnv } from "@/lib/runtime";

function emailHtml(
  displayName: string,
  week: number,
  weekly: { correct: number; wrong: number; rank: number },
  overall: { correct: number; wrong: number; rank: number },
  siteUrl: string,
) {
  return `<!doctype html>
  <html><body style="margin:0;background:#f4ebdd;color:#102a43;font-family:Arial,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 18px">
    <div style="border-top:8px solid #b42332;background:#fffdf8;padding:32px;border-bottom:4px solid #c59b55">
      <p style="margin:0 0 12px;color:#b42332;font-weight:700;letter-spacing:.12em">SEC PICK'EM 2026 • WEEK ${week}</p>
      <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:36px">Your weekly report, ${displayName}.</h1>
      <p style="font-size:18px;line-height:1.6">This week you finished <strong>${weekly.correct}–${weekly.wrong}</strong> and ranked <strong>#${weekly.rank}</strong>.</p>
      <div style="display:flex;gap:16px;margin:26px 0">
        <div style="flex:1;border:1px solid #102a43;padding:18px"><small>WEEK ${week}</small><br><strong style="font-size:28px">${weekly.correct}–${weekly.wrong}</strong></div>
        <div style="flex:1;border:1px solid #102a43;padding:18px"><small>SEASON / RANK</small><br><strong style="font-size:28px">${overall.correct}–${overall.wrong} / #${overall.rank}</strong></div>
      </div>
      <a href="${siteUrl}/public-picks" style="display:inline-block;padding:14px 22px;background:#b42332;color:#fff;text-decoration:none;font-weight:700">See the full standings →</a>
    </div>
  </div></body></html>`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = runtimeEnv();
  if (settings.EMAILS_ENABLED !== "true") {
    return Response.json(
      { disabled: true, message: "Weekly email reports are disabled." },
      { status: 503 },
    );
  }
  if (!settings.RESEND_API_KEY || !settings.EMAIL_FROM || !settings.SITE_URL) {
    return Response.json(
      { error: "Email is ready but RESEND_API_KEY, EMAIL_FROM, and SITE_URL must be configured." },
      { status: 503 },
    );
  }

  try {
    const db = getD1();
    const latest = await db
      .prepare("SELECT MAX(week) AS week FROM games WHERE completed = 1")
      .first<{ week: number | null }>();
    if (!latest?.week) return Response.json({ sent: 0, message: "No completed weeks yet." });

    const week = Number(latest.week);
    const weekly = await getStandings(week);
    const overall = await getStandings();
    const participants = await db
      .prepare("SELECT id, email, display_name FROM participants ORDER BY id")
      .all<{ id: number; email: string; display_name: string }>();
    let sent = 0;
    let skipped = 0;

    for (const participant of participants.results) {
      const exists = await db
        .prepare("SELECT id FROM email_log WHERE participant_id = ?1 AND week = ?2")
        .bind(participant.id, week)
        .first<{ id: number }>();
      if (exists) {
        skipped += 1;
        continue;
      }
      const weeklyRecord = weekly.find((row) => row.id === participant.id) ?? {
        correct: 0,
        wrong: 0,
        rank: weekly.length || 1,
      };
      const overallRecord = overall.find((row) => row.id === participant.id) ?? {
        correct: 0,
        wrong: 0,
        rank: overall.length || 1,
      };
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${settings.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: settings.EMAIL_FROM,
          to: [participant.email],
          subject: `SEC Pick'em Week ${week}: ${weeklyRecord.correct}–${weeklyRecord.wrong}, Rank #${weeklyRecord.rank}`,
          html: emailHtml(
            participant.display_name,
            week,
            weeklyRecord,
            overallRecord,
            settings.SITE_URL,
          ),
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Email provider rejected a message: ${detail.slice(0, 180)}`);
      }
      const result = (await response.json()) as { id?: string };
      await db
        .prepare(
          `INSERT INTO email_log (participant_id, week, status, provider_id)
           VALUES (?1, ?2, 'sent', ?3)`,
        )
        .bind(participant.id, week, result.id ?? null)
        .run();
      sent += 1;
    }

    return Response.json({ week, sent, skipped });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Weekly email run failed" },
      { status: 500 },
    );
  }
}

export const POST = GET;
