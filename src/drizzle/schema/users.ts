import { relations } from "drizzle-orm";
import { pgEnum, pgTable, uuid, varchar, index } from "drizzle-orm/pg-core";

import { books } from "./books";
import { createdAt, updatedAt } from "../schemaHelper";
import { reviews } from "./reviews";
import { refreshTokens } from "./refreshTokens";

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique("users_email_key"),
    role: userRoleEnum("role").notNull().default("USER"),
    hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),

    createdAt,
    updatedAt,
  },
  (table) => [
    index("users_created_at_id_idx").on(table.createdAt, table.id),
    index("users_name_id_idx").on(table.name, table.id),
  ],
);

export const usersReference = relations(users, ({ many }) => ({
  books: many(books),
  reviews: many(reviews),
  refreshTokens: many(refreshTokens),
}));
