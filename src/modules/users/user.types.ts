import type { users } from "../../drizzle/schema";

export type User = Omit<typeof users.$inferSelect, "hashedPassword">;
export type UpdateUser = Partial<Omit<User, "id" | "createdAt">>;
