import z from "zod";
import type { GraphQLContext } from "../../types/context";
import { AuthorService } from "./author.service";
import { authorsQuerySchema, createAuthorSchema, updateAuthorSchema } from "./validation";
import { NotFoundError, ValidationError } from "../../graphql/errors";
import { requireAdmin } from "../../graphql/auth";

export const authorResolvers = {
  Query: {
    author: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      if (!z.uuid().safeParse(id).success) {
        throw new NotFoundError(`Author with id ${id} not found`);
      }

      const authorService = new AuthorService(context.db);
      return authorService.getAuthorById(id);
    },

    authors: async (_: unknown, args: unknown, context: GraphQLContext) => {
      const authorService = new AuthorService(context.db);

      const parsed = await authorsQuerySchema.safeParseAsync(args);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'authors'", flattened.fieldErrors);
      }

      return authorService.getAuthors(parsed.data);
    },
  },

  Mutation: {
    createAuthor: async (_: unknown, args: { input: unknown }, context: GraphQLContext) => {
      requireAdmin(context);

      const parsed = createAuthorSchema.safeParse(args.input);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'createAuthor'", flattened.fieldErrors);
      }

      const authorService = new AuthorService(context.db);
      return authorService.createAuthor(parsed.data);
    },

    updateAuthor: async (_: unknown, args: { id: string; input: unknown }, context: GraphQLContext) => {
      requireAdmin(context);

      if (!z.uuid().safeParse(args.id).success) {
        throw new NotFoundError(`Author with id ${args.id} not found`);
      }

      const parsed = updateAuthorSchema.safeParse(args.input);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'updateAuthor'", flattened.fieldErrors);
      }

      const authorService = new AuthorService(context.db);
      const author = await authorService.updateAuthor(args.id, parsed.data);

      if (!author) throw new NotFoundError(`Author with id ${args.id} not found`);

      return author;
    },

    deleteAuthor: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAdmin(context);

      if (!z.uuid().safeParse(id).success) {
        throw new NotFoundError(`Author with id ${id} not found`);
      }

      const authorService = new AuthorService(context.db);
      const author = await authorService.deleteAuthor(id);

      if (!author) throw new NotFoundError(`Author with id ${id} not found`);

      return author;
    },
  },
};
