import { relations } from "drizzle-orm";
import { pgTable, uuid, text, integer, index } from "drizzle-orm/pg-core";

import { users } from "./users";
import { books } from "./books";
import { createdAt, updatedAt } from "../schemaHelper";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    content: text("content").notNull(),
    rating: integer("rating").notNull(),

    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    bookId: uuid("book_id")
      .references(() => books.id, { onDelete: "cascade" })
      .notNull(),

    createdAt,
    updatedAt,
  },
  (table) => [
    index("reviews_user_id_idx").on(table.userId),
    index("reviews_book_id_idx").on(table.bookId),
  ],
);

export const reviewsReference = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),

  book: one(books, {
    fields: [reviews.bookId],
    references: [books.id],
  }),
}));
