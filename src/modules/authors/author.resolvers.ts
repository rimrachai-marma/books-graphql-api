import { NotFoundError } from "../../graphql/errors";
import type { GraphQLContext } from "../../types/context";
import { AuthorService } from "./author.service";

export const authorResolvers = {
  Query: {
    author: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const authorService = new AuthorService(context.db);
    },

    authors: async (_: unknown, args: unknown, context: GraphQLContext) => {
      const authorService = new AuthorService(context.db);
    },
  },

  Mutation: {
    createAuthor: async (_: unknown, { input }: { input: unknown }, context: GraphQLContext) => {
      requ;

      const authorService = new AuthorService(context.db);
      return authorService.createAuthor();
    },

    updateAuthor: async (_: unknown, { id, input }: { id: string; input: unknown }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const authorService = new AuthorService(context.db);
      const author = await authorService.updateAuthor(id, input);

      if (!author) {
        throw new NotFoundError("Author not found");
      }

      return author;
    },

    deleteAuthor: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const authorService = new AuthorService(context.db);
      const author = await authorService.deleteAuthor(id);

      if (!author) {
        throw new NotFoundError("Author not found");
      }

      return author;
    },
  },
};
