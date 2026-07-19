import { createYoga } from "graphql-yoga";

import { schema } from "./schema";
import { createContext } from "./context";
import { maskError } from "./errorFormatter";

export const yoga = createYoga({
  schema,
  context: (initialContext) => createContext(initialContext),
  // graphiql: process.env.NODE_ENV !== "production",
  maskedErrors: { maskError },
});
