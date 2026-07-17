import type { GraphQLContext } from "../../types/context";
import { AuthorService } from "./author.service";

export const authorResolvers = {
  Query: {
    author: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      const authorService = new AuthorService(context.db);
    },

    authors: async (
      _: unknown,
      args: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
        filter?: {
          nameContains?: string;
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
      const authorService = new AuthorService(context.db);
    },
  },

  Mutation: {
    createAuthor: async (
      _: unknown,
      { input }: { input: { name: string } },
      context: GraphQLContext,
    ) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const authorService = new AuthorService(context.db);
      return authorService.createAuthor(input);
    },

    updateAuthor: async (
      _: unknown,
      { id, input }: { id: string; input: { name?: string } },
      context: GraphQLContext,
    ) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const authorService = new AuthorService(context.db);
      const author = await authorService.updateAuthor(id, input);

      if (!author) {
        throw new Error("Author not found");
      }

      return author;
    },

    deleteAuthor: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const authorService = new AuthorService(context.db);
      const author = await authorService.deleteAuthor(id);

      if (!author) {
        throw new Error("Author not found");
      }

      return author;
    },
  },
};
