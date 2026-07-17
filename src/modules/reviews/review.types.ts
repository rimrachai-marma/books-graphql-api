import { reviews } from "../../drizzle/schema";

export type NewReview = typeof reviews.$inferInsert;
export type Review = typeof reviews.$inferSelect;
