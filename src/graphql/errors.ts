import { GraphQLError } from "graphql";

export class AuthenticationError extends GraphQLError {
  constructor(message = "Invalid or expired token") {
    super(message, {
      extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
    });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message = "You don't have permission to perform this action") {
    super(message, {
      extensions: { code: "FORBIDDEN", http: { status: 403 } },
    });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(message = "Resource not found") {
    super(message, {
      extensions: { code: "NOT_FOUND", http: { status: 404 } },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string, fields?: Record<string, string | string[]>) {
    super(message, {
      extensions: { code: "BAD_REQUEST", http: { status: 400 }, fields },
    });
  }
}
