import z from "zod";
import { UserService } from "./user.service";
import type { GraphQLContext } from "../../types/context";
import { NotFoundError, ValidationError } from "../../graphql/errors";
import { updateUserSchema, usersQuerySchema } from "./validation";

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const userService = new UserService(context.db);
      return userService.getUserById(context.user?.id!);
    },

    user: async (_: unknown, { userId }: { userId: string }, context: GraphQLContext) => {
      if (!z.uuid().safeParse(userId).success) {
        throw new NotFoundError(`User with id ${userId} not found`);
      }

      const userService = new UserService(context.db);
      return userService.getUserById(userId);
    },

    users: async (_: unknown, args: unknown, context: GraphQLContext) => {
      const parsed = await usersQuerySchema.safeParseAsync(args);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'users'", flattened.fieldErrors);
      }

      const userService = new UserService(context.db);
      return userService.getUsers(parsed.data);
    },
  },

  Mutation: {
    updateUser: async (_: unknown, args: { input: unknown }, context: GraphQLContext) => {
      const parsed = updateUserSchema.safeParse(args.input);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'updateUser'", flattened.fieldErrors);
      }

      const userService = new UserService(context.db);
      return userService.updateUser(context.user?.id!, parsed.data);
    },
  },
};
