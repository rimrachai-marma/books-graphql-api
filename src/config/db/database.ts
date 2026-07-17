import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../../drizzle/schema";

export const client = postgres(process.env.DATABASE_URL as string, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n📦 Closing database connections...");
  await client.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n📦 Closing database connections...");
  await client.end();
  process.exit(0);
});
