import { createYoga } from "graphql-yoga";

import { schema } from "./schema";
import { createContext } from "./context";
import { GraphQLError } from "graphql";

export const yoga = createYoga({
  schema,
  context: (initialContext) => createContext(initialContext),
  graphiql: process.env.NODE_ENV !== "production",
  maskedErrors: {
    maskError(error, message) {
      // Let your own known errors pass through untouched
      if (error instanceof GraphQLError && error.extensions?.code !== "INTERNAL_SERVER_ERROR") {
        return error;
      }
      // Log the real error server-side
      console.error(error);
      // Return a generic message to the client
      return new GraphQLError(message, {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    },
  },
});
