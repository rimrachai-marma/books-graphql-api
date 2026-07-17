import type { Request, Response, NextFunction } from "express";

import asyncHandler from "./asyncHandler";
import { CookieMap } from "bun";
import { AppError } from "../utils/app-error";
import { jwtService } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: "USER" | "ADMIN";
      };
    }
  }
}

export const auth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const cookies = new CookieMap(req.headers.cookie ?? "");

  const token = cookies.get(process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token") ?? extractBearer(req);

  if (!token) {
    throw new AppError(401, "Access denied. Authentication required");
  }

  const payload = await jwtService.verify(token);

  if (!payload || (payload.role !== "USER" && payload.role !== "ADMIN")) {
    throw new AppError(401, "Invalid or expired token.");
  }

  req.user = {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };

  next();
});

export const admin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new AppError(401, "Access denied. Authentication required");
  }

  if (req.user.role !== "ADMIN") {
    throw new AppError(403, "Access denied. Admin privileges required");
  }

  next();
});

export function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
