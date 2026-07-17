import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

import { books } from "./books";
import { createdAt, updatedAt } from "../schemaHelper";
import { reviews } from "./reviews";
import { refreshTokens } from "./refreshTokens";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique("users_email_key"),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),

  createdAt,
  updatedAt,
});

export const usersReference = relations(users, ({ many }) => ({
  books: many(books),
  reviews: many(reviews),
  refreshTokens: many(refreshTokens),
}));
