import z from "zod";
import { ValidationError } from "../../errors";
import type { GraphQLContext } from "../../types/context";
import { BookService } from "./book.service";
import { booksQuerySchema } from "./validation";
import { requireAuth } from "../../utils/authorization";

export const bookResolvers = {
  Query: {
    book: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const bookService = new BookService(context.db);
      return bookService.getBookById(id);
    },

    books: async (
      _: unknown,
      args: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
        filter?: {
          authorId?: string;
          titleContains?: string;
          createdAfter?: string;
          createdBefore?: string;
        };
        sort: {
          field: "TITLE" | "CREATED";
          direction: "ASC" | "DESC";
        };
      },
      context: GraphQLContext,
    ) => {
      const bookService = new BookService(context.db);

      const parsed = await booksQuerySchema.safeParseAsync(args);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'books'", flattened.fieldErrors);
      }

      return bookService.getBooks(args);
    },
  },

  Book: {
    user: async (parent: { userId: string }, _: unknown, context: GraphQLContext) => {
      // ignore this, I will do it letter
    },

    author: async (parent: { authorId: string }, _: unknown, context: GraphQLContext) => {
      // also ignore this
    },
  },

  Mutation: {
    createBook: async (
      _: unknown,
      { input }: { input: { title: string; authorId: string } },
      context: GraphQLContext,
    ) => {
      const user = requireAuth(context);

      const bookService = new BookService(context.db);

      return bookService.createBook({
        title: input.title,
        authorId: input.authorId,
        userId: user.id,
      });
    },

    updateBook: async (
      _: unknown,
      { id, input }: { id: string; input: { title?: string; authorId?: string } },
      context: GraphQLContext,
    ) => {
      requireAuth(context);

      const bookService = new BookService(context.db);

      const book = await bookService.updateBook(id, input);

      if (!book) {
        throw new Error("Book not found or unauthorized");
      }

      return book;
    },

    deleteBook: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      requireAuth(context);

      const bookService = new BookService(context.db);
      const book = await bookService.deleteBook(id);

      if (!book) {
        throw new Error("Book not found or unauthorized");
      }

      return book;
    },
  },
};
