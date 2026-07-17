import { GraphQLError } from "graphql";

export function maskError(error: unknown, message: string) {
  if (error instanceof GraphQLError && error.extensions?.code !== "INTERNAL_SERVER_ERROR") {
    return error;
  }
  console.error(error);
  return new GraphQLError(message, {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}
