import { mkdir, writeFile } from "node:fs/promises";

const season = 2026;
const secTeamIds = new Set([
  "333", "8", "2", "57", "61", "96", "99", "344",
  "142", "201", "145", "2579", "2633", "251", "245", "238",
]);

function scoreValue(score) {
  const value = Number(
    typeof score === "object" && score
      ? score.value ?? score.displayValue
      : score,
  );
  return Number.isFinite(value) ? value : null;
}

function parseEvent(event) {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((team) => team.homeAway === "home");
  const away = competition?.competitors?.find((team) => team.homeAway === "away");
  if (!event.id || !event.date || !home?.team?.id || !away?.team?.id) return null;
  const homeScore = scoreValue(home.score);
  const awayScore = scoreValue(away.score);
  const completed = Boolean(competition?.status?.type?.completed);
  const homeTeam = home.team.shortDisplayName ?? home.team.location ?? home.team.displayName;
  const awayTeam = away.team.shortDisplayName ?? away.team.location ?? away.team.displayName;
  return {
    id: event.id,
    week: event.week?.number ?? 0,
    startTime: event.date,
    homeTeam,
    awayTeam,
    homeTeamId: home.team.id,
    awayTeamId: away.team.id,
    homeSec: secTeamIds.has(home.team.id),
    awaySec: secTeamIds.has(away.team.id),
    homeScore,
    awayScore,
    winnerTeam:
      completed && homeScore !== null && awayScore !== null
        ? homeScore > awayScore ? homeTeam : awayTeam
        : null,
    completed,
    status: competition?.status?.type?.description ?? "Scheduled",
  };
}

const schedules = await Promise.all(
  [...secTeamIds].map(async (teamId) => {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${teamId}/schedule?season=${season}&seasontype=2`,
    );
    if (!response.ok) throw new Error(`Schedule ${teamId} returned ${response.status}`);
    const payload = await response.json();
    return (payload.events ?? []).map(parseEvent).filter(Boolean);
  }),
);

const unique = new Map();
for (const schedule of schedules) {
  for (const game of schedule) unique.set(game.id, game);
}
const games = [...unique.values()].sort(
  (a, b) => a.week - b.week || a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id),
);
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../data/2026-sec-games.json", import.meta.url),
  `${JSON.stringify(games, null, 2)}\n`,
);
console.log(`Wrote ${games.length} unique SEC regular-season games.`);
