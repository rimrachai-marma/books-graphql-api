import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

import { users } from "./users";
import { createdAt, updatedAt } from "../schemaHelper";

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull().unique("refresh_tokens_token_hash_key"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("refresh_tokens_user_id_idx").on(table.userId),
    // Speeds up the userId + revokedAt IS NULL lookup that runs on every refresh call, and stays small since revoked rows never enter it.
    index("refresh_tokens_user_active_idx")
      .on(table.userId, table.revokedAt)
      .where(sql`${table.revokedAt} IS NULL`),
  ],
);

export const refreshTokensReference = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
