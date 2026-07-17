import type { Database } from "../config/db/database";

export interface GraphQLContext {
  db: Database;
  user?: {
    id: string;
    email: string;
    name: string;
    role: "USER" | "ADMIN";
  };
  authError?: "NO_TOKEN" | "INVALID_TOKEN";
}
