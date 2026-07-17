import { UserService } from "./user.service";
import type { GraphQLContext } from "../../types/context";
import { requireAuth } from "../../graphql/auth";

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const user = requireAuth(context);
      const userService = new UserService(context.db);
    },

    user: async (_: unknown, { userId }: { userId: string }, context: GraphQLContext) => {
      const userService = new UserService(context.db);
    },

    users: async (_: unknown, args: unknown, context: GraphQLContext) => {
      const userService = new UserService(context.db);
    },
  },

  Mutation: {
    updateUser: async (_: unknown, { input }: { input: unknown }, context: GraphQLContext) => {
      const userService = new UserService(context.db);
      return userService.updateUser(context.user.id, input);
    },
  },
};
