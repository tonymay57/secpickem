import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const participants = sqliteTable(
  "participants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
    phone: text("phone"),
    tiebreaker: integer("tiebreaker"),
    submittedAt: text("submitted_at"),
    paymentClaimedAt: text("payment_claimed_at"),
    paymentVerifiedAt: text("payment_verified_at"),
    paymentVerifiedBy: text("payment_verified_by"),
    paymentNote: text("payment_note"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("participants_email_idx").on(table.email)],
);

export const messagePosts = sqliteTable(
  "message_posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    participantId: integer("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text("deleted_at"),
    deletedBy: text("deleted_by"),
  },
  (table) => [index("message_posts_created_idx").on(table.createdAt)],
);

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    week: integer("week").notNull(),
    startTime: text("start_time").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    homeTeamId: text("home_team_id").notNull(),
    awayTeamId: text("away_team_id").notNull(),
    homeSec: integer("home_sec", { mode: "boolean" }).notNull(),
    awaySec: integer("away_sec", { mode: "boolean" }).notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    winnerTeam: text("winner_team"),
    completed: integer("completed", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status").notNull().default("Scheduled"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("games_week_idx").on(table.week),
    index("games_start_time_idx").on(table.startTime),
  ],
);

export const picks = sqliteTable(
  "picks",
  {
    participantId: integer("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    selection: text("selection", { enum: ["home", "away", "split"] })
      .notNull(),
    selectedTeam: text("selected_team"),
    points: integer("points"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.participantId, table.gameId] }),
    index("picks_game_idx").on(table.gameId),
  ],
);

export const participantFavorites = sqliteTable(
  "participant_favorites",
  {
    participantId: integer("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    favoriteParticipantId: integer("favorite_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.participantId, table.favoriteParticipantId] }),
    index("participant_favorites_owner_idx").on(table.participantId),
  ],
);

export const emailLog = sqliteTable(
  "email_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    participantId: integer("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    status: text("status").notNull(),
    providerId: text("provider_id"),
    sentAt: text("sent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("email_log_participant_week_idx").on(
      table.participantId,
      table.week,
    ),
  ],
);
