# SEC Pick'em 2026

A season-long SEC football pick'em application with account-based ballots,
public picks, team-result scoring, CSV export, automated score updates, and
weekly participant reports.

## Scoring

- SEC vs. nonconference: one SEC team result and one possible point.
- SEC vs. SEC, winner selected: two team results and two possible points.
- SEC vs. SEC, Split selected: an automatic 1–1 record and one point.
- Split is rejected by both the interface and server for nonconference games.
- Picks lock September 2, 2026 at 11:59 PM Central.

## Participant flow

1. Sign in with the platform-provided ChatGPT authentication.
2. Make picks using either the By Week or By Team view.
3. Picks save automatically and appear on the public ledger.
4. Final scores recalculate every participant's correct/incorrect team record.
5. Weekly email reports include that week's record, overall record, and rank.

## Operations

- D1 stores participants, games, picks, points, and email history.
- The schedule and results sync from ESPN's public college-football schedule
  response. No team logos or official marks are used.
- `/api/export` downloads a long-form CSV that opens directly in Excel.
- Scheduled GitHub Actions call the sync and weekly-email endpoints.
- Weekly email delivery is ready for Resend once the environment values in
  `.env.example` are configured.
- The payment endpoint intentionally remains inactive until the commissioner
  chooses the entry fee and payment account.

## Required repository secrets

- `SITE_URL`
- `CRON_SECRET`

## Required hosted environment values for weekly email

- `CRON_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SITE_URL`
