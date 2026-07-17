import { authors } from "../../drizzle/schema/authors";

export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
export type UpdateAuthor = Partial<Omit<Author, "id" | "createdAt">>;
