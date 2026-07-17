import { CookieMap } from "bun";
import type { YogaInitialContext } from "graphql-yoga";

import type { GraphQLContext } from "../types/context";
import { db } from "../config/db/database";
import { jwtService } from "../utils/jwt";

export async function createContext(initialContext: YogaInitialContext): Promise<GraphQLContext> {
  const context: GraphQLContext = { db };

  const cookies = new CookieMap(initialContext.request.headers.get("cookie") ?? "");

  const authHeader = initialContext.request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : (authHeader ?? undefined);

  const cookieToken = cookies.get("access_token") ?? undefined;

  const token = headerToken ?? cookieToken;

  if (!token) {
    context.authError = "NO_TOKEN";
    return context;
  }

  const payload = await jwtService.verify(token);

  if (!payload) {
    context.authError = "INVALID_TOKEN";
    return context;
  }

  context.user = {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };

  return context;
}
