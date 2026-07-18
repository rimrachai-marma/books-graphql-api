import { z } from "zod";

export const authorsQuerySchema = z
  .object({
    first: z.number().int().positive().max(100).optional(),
    after: z.string().optional(),
    last: z.number().int().positive().max(100).optional(),
    before: z.string().optional(),
    filter: z
      .object({
        nameContains: z.string().optional(),
        createdAfter: z.iso.datetime().optional(),
        createdBefore: z.iso.datetime().optional(),
      })
      .optional(),
    sort: z.object({
      field: z.enum(["NAME", "CREATED"]),
      direction: z.enum(["ASC", "DESC"]),
    }),
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

export const createAuthorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or fewer"),
});

export const updateAuthorSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(255, "Name must be 255 characters or fewer").optional(),
});
