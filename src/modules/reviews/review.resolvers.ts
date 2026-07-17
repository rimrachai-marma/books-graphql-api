import type { GraphQLContext } from "../../types/context";
import { ReviewService } from "./review.service";

export const reviewResolvers = {
  Query: {
    reviews: async (_: unknown, args: unknown, context: GraphQLContext) => {
      const reviewService = new ReviewService(context.db);
    },
  },

  Review: {
    user: async (parent: { userId: string }, _: unknown, context: GraphQLContext) => {},
  },

  Mutation: {
    createReview: async (_: unknown, { input }: { input: unknown }, context: GraphQLContext) => {
      const reviewService = new ReviewService(context.db);
    },

    deleteReview: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const reviewService = new ReviewService(context.db);
      const review = await reviewService.deleteReview(id);
      return review;
    },
  },
};
