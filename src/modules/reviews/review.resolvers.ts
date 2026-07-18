import z from "zod";
import type { GraphQLContext } from "../../types/context";
import { ReviewService } from "./review.service";
import { createReviewSchema, reviewsQuerySchema } from "./validation";
import { NotFoundError, ValidationError } from "../../graphql/errors";
import { requireAuth } from "../../graphql/auth";

export const reviewResolvers = {
  Query: {
    reviews: async (_: unknown, args: unknown, context: GraphQLContext) => {
      const parsed = await reviewsQuerySchema.safeParseAsync(args);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'reviews'", flattened.fieldErrors);
      }

      const reviewService = new ReviewService(context.db);
      return reviewService.getReviewsByBook(parsed.data);
    },
  },

  Review: {
    user: async (parent: { userId: string }, _: unknown, context: GraphQLContext) => {
      return context.loaders.userLoader.load(parent.userId);
    },

    book: async (parent: { bookId: string }, _: unknown, context: GraphQLContext) => {
      return context.loaders.bookLoader.load(parent.bookId);
    },
  },

  Mutation: {
    createReview: async (_: unknown, args: { input: unknown }, context: GraphQLContext) => {
      const user = requireAuth(context);

      const parsed = createReviewSchema.safeParse(args.input);

      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        throw new ValidationError("Invalid arguments for 'createReview'", flattened.fieldErrors);
      }

      const reviewService = new ReviewService(context.db);

      return reviewService.createReview({
        userId: user.id,
        ...parsed.data,
      });
    },

    deleteReview: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireAuth(context);

      if (!z.uuid().safeParse(id).success) {
        throw new NotFoundError(`Review with id ${id} not found`);
      }

      const reviewService = new ReviewService(context.db);
      return reviewService.deleteReview(user.id, id);
    },
  },
};
