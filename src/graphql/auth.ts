import type { GraphQLContext } from "../types/context";
import { AuthenticationError, ForbiddenError } from "./errors";

export function requireAuth(context: GraphQLContext) {
  if (context.user) return context.user;

  if (context.authError === "INVALID_TOKEN") {
    throw new AuthenticationError("Invalid or expired token");
  }

  throw new AuthenticationError("Authentication required");
}

export function requireAdmin(context: GraphQLContext) {
  const user = requireAuth(context);

  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }

  return user;
}
