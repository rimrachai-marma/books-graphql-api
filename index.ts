import http from "http";
import { sql } from "drizzle-orm";

import { app } from "./src/app";
import { yoga } from "./src/graphql/server";
import { db } from "./src/config/db/database";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

async function main() {
  await db.execute(sql`select 1`);
  console.log("✅ Database connected");

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 GraphQL endpoint: http://localhost:${PORT}${yoga.graphqlEndpoint}`);
  });
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
