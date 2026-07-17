import { UserService } from "./user.service";
import type { GraphQLContext } from "../../types/context";
import { requireAuth } from "../../utils/authorization";

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const user = requireAuth(context);
      const userService = new UserService(context.db);
    },

    user: async (_: unknown, { userId }: { userId: string }, context: GraphQLContext) => {
      const userService = new UserService(context.db);
    },

    users: async (
      _: unknown,
      args: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
        filter?: {
          search?: string;
          createdAfter?: string;
          createdBefore?: string;
        };
        sort: {
          field: "NAME" | "CREATED_AT";
          direction: "ASC" | "DESC";
        };
      },
      context: GraphQLContext,
    ) => {
      const userService = new UserService(context.db);
    },
  },

  Mutation: {
    updateUser: async (
      _: unknown,
      { input }: { input: { name?: string; email?: string } },
      context: GraphQLContext,
    ) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const userService = new UserService(context.db);
      return userService.updateUser(context.user.id, input);
    },
  },
};
