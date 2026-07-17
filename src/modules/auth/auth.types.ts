import type { users } from "../../drizzle/schema";

export type User = Omit<typeof users.$inferSelect, "hashedPassword">;
export type NewUser = Omit<typeof users.$inferInsert, "hashedPassword"> & {
  password: string;
};
export type LoginData = { email: string; password: string };
