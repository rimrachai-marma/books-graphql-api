import { z } from "zod";

export const booksQuerySchema = z
  .object({
    first: z.number().int().positive().optional(),
    after: z.string().optional(),
    last: z.number().int().positive().optional(),
    before: z.string().optional(),
    filter: z
      .object({
        authorId: z.string().optional(),
        titleContains: z.string().optional(),
        createdAfter: z.iso.datetime().optional(),
        createdBefore: z.iso.datetime().optional(),
      })
      .optional(),
    sort: z.object({
      field: z.enum(["TITLE", "CREATED"]),
      direction: z.enum(["ASC", "DESC"]),
    }),
  })
  .superRefine((args, ctx) => {
    if (args.first != null && args.last != null) {
      ctx.addIssue({ code: "custom", message: "Cannot use both 'first' and 'last'", path: ["first"] });
    }
    if (args.first == null && args.last == null) {
      ctx.addIssue({ code: "custom", message: "Provide 'first' or 'last'", path: ["first"] });
    }
    if (args.first != null && args.before != null) {
      ctx.addIssue({ code: "custom", message: "Use 'last' with 'before'", path: ["before"] });
    }
    if (args.last != null && args.after != null) {
      ctx.addIssue({ code: "custom", message: "Use 'first' with 'after'", path: ["after"] });
    }
  });
