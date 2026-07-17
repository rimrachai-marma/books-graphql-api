import type { Database } from "../config/db/database";
import type { Loaders } from "../graphql/dataloaders";

export interface GraphQLContext {
  db: Database;
  loaders: Loaders;
  user?: {
    id: string;
    email: string;
    name: string;
    role: "USER" | "ADMIN";
  };
  authError?: "NO_TOKEN" | "INVALID_TOKEN";
}
