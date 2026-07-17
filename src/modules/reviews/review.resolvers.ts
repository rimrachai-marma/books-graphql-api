import type { GraphQLContext } from "../../types/context";
import { ReviewService } from "./review.service";

export const reviewResolvers = {
  Query: {
    reviews: async (
      _: unknown,
      args: {
        bookId: string;
        first?: number;
        after?: string;
        last?: number;
        before?: string;
      },
      context: GraphQLContext,
    ) => {
      const reviewService = new ReviewService(context.db);
    },
  },

  Review: {
    user: async (
      parent: { userId: string },
      _: unknown,
      context: GraphQLContext,
    ) => {},
  },

  Mutation: {
    createReview: async (
      _: unknown,
      { input }: { input: { rating: number; content: string; bookId: string } },
      context: GraphQLContext,
    ) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      // Validate rating
      if (input.rating < 1 || input.rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      const reviewService = new ReviewService(context.db);
      return reviewService.createReview({
        ...input,
        userId: context.user.id,
      });
    },

    deleteReview: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const reviewService = new ReviewService(context.db);
      const review = await reviewService.deleteReview(id);

      if (!review) {
        throw new Error("Review not found");
      }

      return review;
    },
  },
};
