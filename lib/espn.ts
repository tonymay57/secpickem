import { SEASON, SEC_TEAM_IDS, SEC_TEAMS } from "@/lib/constants";
import { ensureSchema } from "@/lib/data";
import { getD1 } from "@/lib/runtime";
import type { Game } from "@/lib/types";

type EspnCompetitor = {
  id?: string;
  homeAway?: "home" | "away";
  score?: { value?: number; displayValue?: string } | string;
  team?: {
    id?: string;
    shortDisplayName?: string;
    location?: string;
    displayName?: string;
  };
};

type EspnEvent = {
  id?: string;
  date?: string;
  week?: { number?: number };
  seasonType?: { type?: number; id?: string };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: {
      type?: {
        completed?: boolean;
        description?: string;
        shortDetail?: string;
      };
    };
  }>;
};

type EspnSchedule = { events?: EspnEvent[] };

function numericScore(score: EspnCompetitor["score"]): number | null {
  if (typeof score === "string") {
    const value = Number(score);
    return Number.isFinite(value) ? value : null;
  }
  if (!score) return null;
  const value = Number(score.value ?? score.displayValue);
  return Number.isFinite(value) ? value : null;
}

function teamName(competitor: EspnCompetitor): string {
  return (
    competitor.team?.shortDisplayName ??
    competitor.team?.location ??
    competitor.team?.displayName ??
    "TBD"
  );
}

function parseEvent(event: EspnEvent): Game | null {
  if (!event.id || !event.date || event.seasonType?.type !== 2) return null;
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find(
    (competitor) => competitor.homeAway === "home",
  );
  const away = competition?.competitors?.find(
    (competitor) => competitor.homeAway === "away",
  );
  if (!home?.team?.id || !away?.team?.id) return null;

  const homeScore = numericScore(home.score);
  const awayScore = numericScore(away.score);
  const completed = Boolean(competition?.status?.type?.completed);
  const homeName = teamName(home);
  const awayName = teamName(away);
  const winnerTeam =
    completed && homeScore !== null && awayScore !== null
      ? homeScore > awayScore
        ? homeName
        : awayName
      : null;

  return {
    id: event.id,
    week: event.week?.number ?? 0,
    startTime: event.date,
    homeTeam: homeName,
    awayTeam: awayName,
    homeTeamId: home.team.id,
    awayTeamId: away.team.id,
    homeSec: SEC_TEAM_IDS.has(home.team.id),
    awaySec: SEC_TEAM_IDS.has(away.team.id),
    homeScore,
    awayScore,
    winnerTeam,
    completed,
    status:
      competition?.status?.type?.description ??
      competition?.status?.type?.shortDetail ??
      "Scheduled",
  };
}

async function fetchTeamSchedule(teamId: string): Promise<Game[]> {
  const url = new URL(
    `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${teamId}/schedule`,
  );
  url.searchParams.set("season", String(SEASON));
  url.searchParams.set("seasontype", "2");
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Schedule provider returned ${response.status}`);
  }
  const payload = (await response.json()) as EspnSchedule;
  return (payload.events ?? [])
    .map(parseEvent)
    .filter((game): game is Game => Boolean(game));
}

export async function syncSecGames() {
  await ensureSchema();
  const schedules = await Promise.all(
    SEC_TEAMS.map((team) => fetchTeamSchedule(team.id)),
  );
  const games = new Map<string, Game>();
  for (const schedule of schedules) {
    for (const game of schedule) games.set(game.id, game);
  }

  const db = getD1();
  const statements = [...games.values()].map((game) =>
    db
      .prepare(
        `INSERT INTO games (
           id, week, start_time, home_team, away_team,
           home_team_id, away_team_id, home_sec, away_sec,
           home_score, away_score, winner_team, completed, status, updated_at
         ) VALUES (
           ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
           CURRENT_TIMESTAMP
         )
         ON CONFLICT(id) DO UPDATE SET
           week = excluded.week,
           start_time = excluded.start_time,
           home_team = excluded.home_team,
           away_team = excluded.away_team,
           home_team_id = excluded.home_team_id,
           away_team_id = excluded.away_team_id,
           home_sec = excluded.home_sec,
           away_sec = excluded.away_sec,
           home_score = excluded.home_score,
           away_score = excluded.away_score,
           winner_team = excluded.winner_team,
           completed = excluded.completed,
           status = excluded.status,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        game.id,
        game.week,
        game.startTime,
        game.homeTeam,
        game.awayTeam,
        game.homeTeamId,
        game.awayTeamId,
        game.homeSec ? 1 : 0,
        game.awaySec ? 1 : 0,
        game.homeScore,
        game.awayScore,
        game.winnerTeam,
        game.completed ? 1 : 0,
        game.status,
      ),
  );

  for (let offset = 0; offset < statements.length; offset += 80) {
    await db.batch(statements.slice(offset, offset + 80));
  }

  await db
    .prepare(
      `UPDATE picks
       SET points = (
         SELECT CASE
           WHEN picks.selection = 'split' THEN 1
           WHEN picks.selected_team = games.winner_team
             THEN games.home_sec + games.away_sec
           ELSE 0
         END
         FROM games WHERE games.id = picks.game_id
       ), updated_at = CURRENT_TIMESTAMP
       WHERE game_id IN (SELECT id FROM games WHERE completed = 1)`,
    )
    .run();

  return {
    games: games.size,
    completed: [...games.values()].filter((game) => game.completed).length,
    syncedAt: new Date().toISOString(),
  };
}
