import { index, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "../schemaHelper";
import { books } from "./books";
import { relations } from "drizzle-orm";

export const authors = pgTable(
  "authors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("authors_name_idx").on(table.name)],
);

export const authorsReference = relations(authors, ({ many }) => ({
  books: many(books),
}));
