import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Server-side mirror of player best scores (fallback leaderboard + analytics).
export const players = pgTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  photo: text("photo"),
  bestScore: integer("best_score").notNull().default(0),
  bestLevel: integer("best_level").notNull().default(1),
  rank: text("rank").notNull().default("Perunggu"),
  achievedAt: timestamp("achieved_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Every finished run is logged here (history / statistics).
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  playerId: text("player_id").notNull(),
  name: text("name").notNull(),
  score: integer("score").notNull(),
  level: integer("level").notNull(),
  correct: integer("correct").notNull().default(0),
  wrong: integer("wrong").notNull().default(0),
  durationSec: integer("duration_sec").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
