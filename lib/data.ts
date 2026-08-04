import { getD1 } from "@/lib/runtime";
import type { Game, Standing } from "@/lib/types";
import seedGames from "@/data/2026-sec-games.json";

export type ParticipantRow = {
  id: number;
  email: string;
  display_name: string;
  paid: number;
  phone: string | null;
  tiebreaker: number | null;
  submitted_at: string | null;
  payment_claimed_at: string | null;
  payment_verified_at: string | null;
  payment_verified_by: string | null;
  payment_note: string | null;
};

let schemaPromise: Promise<void> | null = null;
let seedPromise: Promise<void> | null = null;

export async function ensureSchema() {
  if (!schemaPromise) {
    const db = getD1();
    schemaPromise = db
      .batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          email TEXT NOT NULL,
          display_name TEXT NOT NULL,
          paid INTEGER DEFAULT 0 NOT NULL,
          phone TEXT,
          tiebreaker INTEGER,
          submitted_at TEXT,
          payment_claimed_at TEXT,
          payment_verified_at TEXT,
          payment_verified_by TEXT,
          payment_note TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`),
        db.prepare(
          "CREATE UNIQUE INDEX IF NOT EXISTS participants_email_idx ON participants (email)",
        ),
        db.prepare(`CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY NOT NULL,
          week INTEGER NOT NULL,
          start_time TEXT NOT NULL,
          home_team TEXT NOT NULL,
          away_team TEXT NOT NULL,
          home_team_id TEXT NOT NULL,
          away_team_id TEXT NOT NULL,
          home_sec INTEGER NOT NULL,
          away_sec INTEGER NOT NULL,
          home_score INTEGER,
          away_score INTEGER,
          winner_team TEXT,
          completed INTEGER DEFAULT 0 NOT NULL,
          status TEXT DEFAULT 'Scheduled' NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`),
        db.prepare("CREATE INDEX IF NOT EXISTS games_week_idx ON games (week)"),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS games_start_time_idx ON games (start_time)",
        ),
        db.prepare(`CREATE TABLE IF NOT EXISTS picks (
          participant_id INTEGER NOT NULL,
          game_id TEXT NOT NULL,
          selection TEXT NOT NULL,
          selected_team TEXT,
          points INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          PRIMARY KEY (participant_id, game_id),
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
          FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        )`),
        db.prepare("CREATE INDEX IF NOT EXISTS picks_game_idx ON picks (game_id)"),
        db.prepare(`CREATE TABLE IF NOT EXISTS participant_favorites (
          participant_id INTEGER NOT NULL,
          favorite_participant_id INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          PRIMARY KEY (participant_id, favorite_participant_id),
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
          FOREIGN KEY (favorite_participant_id) REFERENCES participants(id) ON DELETE CASCADE
        )`),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS participant_favorites_owner_idx ON participant_favorites (participant_id)",
        ),
        db.prepare(`CREATE TABLE IF NOT EXISTS email_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          participant_id INTEGER NOT NULL,
          week INTEGER NOT NULL,
          status TEXT NOT NULL,
          provider_id TEXT,
          sent_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
        )`),
        db.prepare(
          "CREATE UNIQUE INDEX IF NOT EXISTS email_log_participant_week_idx ON email_log (participant_id, week)",
        ),
        db.prepare(`CREATE TABLE IF NOT EXISTS message_posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          participant_id INTEGER NOT NULL,
          body TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          deleted_at TEXT,
          deleted_by TEXT,
          FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
        )`),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS message_posts_created_idx ON message_posts (created_at)",
        ),
      ])
      .then(async () => {
        const columns = await db
          .prepare("PRAGMA table_info(participants)")
          .all<{ name: string }>();
        const existing = new Set(columns.results.map((column) => column.name));
        const additions = [
          ["phone", "ALTER TABLE participants ADD COLUMN phone TEXT"],
          ["tiebreaker", "ALTER TABLE participants ADD COLUMN tiebreaker INTEGER"],
          ["submitted_at", "ALTER TABLE participants ADD COLUMN submitted_at TEXT"],
          ["payment_claimed_at", "ALTER TABLE participants ADD COLUMN payment_claimed_at TEXT"],
          ["payment_verified_at", "ALTER TABLE participants ADD COLUMN payment_verified_at TEXT"],
          ["payment_verified_by", "ALTER TABLE participants ADD COLUMN payment_verified_by TEXT"],
          ["payment_note", "ALTER TABLE participants ADD COLUMN payment_note TEXT"],
        ] as const;
        const missing = additions
          .filter(([name]) => !existing.has(name))
          .map(([, sql]) => db.prepare(sql));
        if (missing.length) await db.batch(missing);
      })
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }
  return schemaPromise;
}

export async function ensureParticipant(email: string, displayName: string) {
  await ensureSchema();
  const db = getD1();
  await db
    .prepare(
      `INSERT INTO participants (email, display_name, updated_at)
       VALUES (?1, ?2, CURRENT_TIMESTAMP)
       ON CONFLICT(email) DO UPDATE SET
         display_name = excluded.display_name,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(email.toLowerCase(), displayName)
    .run();

  return db
    .prepare(
      `SELECT id, email, display_name, paid, phone, tiebreaker, submitted_at,
              payment_claimed_at, payment_verified_at, payment_verified_by, payment_note
       FROM participants WHERE email = ?1`,
    )
    .bind(email.toLowerCase())
    .first<ParticipantRow>();
}

export async function getParticipant(email: string) {
  await ensureSchema();
  return getD1()
    .prepare(
      `SELECT id, email, display_name, paid, phone, tiebreaker, submitted_at,
              payment_claimed_at, payment_verified_at, payment_verified_by, payment_note
       FROM participants WHERE email = ?1`,
    )
    .bind(email.toLowerCase())
    .first<ParticipantRow>();
}

export async function listGames(): Promise<Game[]> {
  await ensureSchema();
  let result = await getD1()
    .prepare(
      `SELECT id, week, start_time, home_team, away_team,
              home_team_id, away_team_id, home_sec, away_sec,
              home_score, away_score, winner_team, completed, status
       FROM games
       ORDER BY week, start_time, id`,
    )
    .all<{
      id: string;
      week: number;
      start_time: string;
      home_team: string;
      away_team: string;
      home_team_id: string;
      away_team_id: string;
      home_sec: number;
      away_sec: number;
      home_score: number | null;
      away_score: number | null;
      winner_team: string | null;
      completed: number;
      status: string;
    }>();

  if (result.results.length === 0) {
    if (!seedPromise) {
      const db = getD1();
      seedPromise = (async () => {
        const statements = (seedGames as Game[]).map((game) =>
          db
            .prepare(
              `INSERT OR IGNORE INTO games (
                 id, week, start_time, home_team, away_team,
                 home_team_id, away_team_id, home_sec, away_sec,
                 home_score, away_score, winner_team, completed, status
               ) VALUES (
                 ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14
               )`,
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
        for (let offset = 0; offset < statements.length; offset += 60) {
          await db.batch(statements.slice(offset, offset + 60));
        }
      })().catch((error) => {
        seedPromise = null;
        throw error;
      });
    }
    await seedPromise;
    result = await getD1()
      .prepare(
        `SELECT id, week, start_time, home_team, away_team,
                home_team_id, away_team_id, home_sec, away_sec,
                home_score, away_score, winner_team, completed, status
         FROM games
         ORDER BY week, start_time, id`,
      )
      .all();
  }

  return result.results.map((row) => ({
    id: row.id,
    week: row.week,
    startTime: row.start_time,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeSec: Boolean(row.home_sec),
    awaySec: Boolean(row.away_sec),
    homeScore: row.home_score,
    awayScore: row.away_score,
    winnerTeam: row.winner_team,
    completed: Boolean(row.completed),
    status: row.status,
  }));
}

export async function getStandings(week?: number): Promise<Standing[]> {
  await ensureSchema();
  const weekClause = typeof week === "number" ? "AND g.week = ?1" : "";
  const statement = getD1().prepare(
    `SELECT p.id, p.display_name,
            COALESCE(SUM(COALESCE(pk.points, 0)), 0) AS correct,
            COALESCE(SUM(
              CASE WHEN g.completed = 1 THEN g.home_sec + g.away_sec ELSE 0 END
            ), 0) AS possible
     FROM participants p
     LEFT JOIN games g ON g.completed = 1 ${weekClause}
     LEFT JOIN picks pk ON pk.participant_id = p.id AND pk.game_id = g.id
     WHERE p.paid = 1 AND p.submitted_at IS NOT NULL
     GROUP BY p.id, p.display_name
     ORDER BY correct DESC, p.display_name COLLATE NOCASE ASC`,
  );
  const result = typeof week === "number"
    ? await statement.bind(week).all<{
        id: number;
        display_name: string;
        correct: number;
        possible: number;
      }>()
    : await statement.all<{
        id: number;
        display_name: string;
        correct: number;
        possible: number;
      }>();

  let priorScore: number | null = null;
  let rank = 0;
  return result.results.map((row, index) => {
    if (priorScore !== row.correct) rank = index + 1;
    priorScore = row.correct;
    return {
      id: row.id,
      displayName: row.display_name,
      correct: Number(row.correct),
      wrong: Number(row.possible) - Number(row.correct),
      possible: Number(row.possible),
      rank,
    };
  });
}
