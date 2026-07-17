import type { Request, Response, NextFunction } from "express";
import z, { ZodType } from "zod";

import asyncHandler from "./asyncHandler";
import { AppError } from "../utils/app-error";

export const validateRequestBody = (schema: ZodType) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const parsed = await schema.safeParseAsync(req.body);

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      throw new AppError(400, "Validation error", { errors: flattened.fieldErrors });
    }

    return next();
  });

export const validateRequestQuery = (schema: ZodType) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const parsed = await schema.safeParseAsync(req.query);

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      throw new AppError(400, "Validation error", { errors: flattened.fieldErrors });
    }

    return next();
  });
