import { z } from "zod";

export const reviewsQuerySchema = z
  .object({
    bookId: z.uuid("Invalid book id"),
    first: z.number().int().positive().max(100).optional(),
    after: z.string().optional(),
    last: z.number().int().positive().max(100).optional(),
    before: z.string().optional(),
  })
  .superRefine((args, ctx) => {
    if (args.first != null && args.last != null) {
      ctx.addIssue({ code: "custom", message: "Cannot use both 'first' and 'last'", path: ["first"] });
    }
    if (args.first == null && args.last == null) {
      ctx.addIssue({ code: "custom", message: "Either 'first' or 'last' is required", path: ["first"] });
    }
    if (args.first != null && args.before != null) {
      ctx.addIssue({ code: "custom", message: "'before' cannot be used with 'first'", path: ["before"] });
    }
    if (args.last != null && args.after != null) {
      ctx.addIssue({ code: "custom", message: "'after' cannot be used with 'last'", path: ["after"] });
    }
  });

export const createReviewSchema = z.object({
  bookId: z.uuid("Provide a valid book id"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  content: z.string().min(1, "Content is required").max(2000, "Content must be 2000 characters or fewer"),
});
