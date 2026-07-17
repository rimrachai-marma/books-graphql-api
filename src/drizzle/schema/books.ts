import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar, index } from "drizzle-orm/pg-core";

import { users } from "./users";
import { createdAt, updatedAt } from "../schemaHelper";
import { authors } from "./authors";
import { reviews } from "./reviews";

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),

    authorId: uuid("author_id")
      .references(() => authors.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    createdAt,
    updatedAt,
  },
  (table) => [
    index("books_title_idx").on(table.title),
    index("books_author_id_idx").on(table.authorId),
    index("books_created_at_id_idx").on(table.createdAt, table.id),
    index("books_title_id_idx").on(table.title, table.id),
  ],
);

export const booksReference = relations(books, ({ one, many }) => ({
  user: one(users, {
    fields: [books.userId],
    references: [users.id],
  }),

  author: one(authors, {
    fields: [books.authorId],
    references: [authors.id],
  }),

  reviews: many(reviews),
}));
