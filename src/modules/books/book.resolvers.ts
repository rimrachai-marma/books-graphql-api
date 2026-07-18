import z from "zod";
import type { GraphQLContext } from "../../types/context";
import { BookService } from "./book.service";
import { booksQuerySchema, createBookSchema, updateBookSchema } from "./validation";
import { NotFoundError, ValidationError } from "../../graphql/errors";
import { requireAuth } from "../../graphql/auth";

export const bookResolvers = {
  Query: {
    book: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      if (!z.uuid().safeParse(id).success) {
        throw new NotFoundError(`Book with id ${id} not found`);
      }
      const bookService = new BookService(context.db);
      return bookService.getBookById(id);
    },

    books: async (_: unknown, args: unknown, context: GraphQLContext) => {
      const bookService = new BookService(context.db);

      const parsed = booksQuerySchema.safeParse(args);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'books'", flattened.fieldErrors);
      }

      return bookService.getBooks(parsed.data);
    },
  },

  Book: {
    user: async (parent: { userId: string }, _: unknown, context: GraphQLContext) => {
      return context.loaders.userLoader.load(parent.userId);
    },

    author: async (parent: { authorId: string }, _: unknown, context: GraphQLContext) => {
      return context.loaders.authorLoader.load(parent.authorId);
    },
  },

  Mutation: {
    createBook: async (_: unknown, args: { input: unknown }, context: GraphQLContext) => {
      const user = requireAuth(context);

      const parsed = createBookSchema.safeParse(args.input);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'createBook'", flattened.fieldErrors);
      }

      const bookService = new BookService(context.db);

      return bookService.createBook({
        userId: user.id,
        ...parsed.data,
      });
    },

    updateBook: async (_: unknown, args: { id: string; input: unknown }, context: GraphQLContext) => {
      const user = requireAuth(context);

      if (!z.uuid().safeParse(args.id).success) {
        throw new NotFoundError(`Book with id ${args.id} not found`);
      }

      const parsed = updateBookSchema.safeParse(args.input);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'updateBook'", flattened.fieldErrors);
      }

      const bookService = new BookService(context.db);

      const book = await bookService.updateBook(user.id, args.id, parsed.data);

      if (!book) {
        throw new NotFoundError(`Book with id ${args.id} not found`);
      }

      return book;
    },

    deleteBook: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);

      if (!z.uuid().safeParse(id).success) {
        throw new NotFoundError(`Book with id ${id} not found`);
      }

      const bookService = new BookService(context.db);
      const book = await bookService.deleteBook(user.id, id);

      if (!book) {
        throw new NotFoundError(`Book with id ${id} not found`);
      }

      return book;
    },
  },
};
