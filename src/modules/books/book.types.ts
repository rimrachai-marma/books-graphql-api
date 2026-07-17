import type { books } from "../../drizzle/schema";

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type UpdateBook = Partial<Omit<Book, "id" | "createdAt">>;
