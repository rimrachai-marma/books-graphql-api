import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";

import asyncHandler from "./asyncHandler";
import { CookieMap } from "bun";
import { AppError } from "../utils/app-error";
import { JWTService, jwtService } from "../utils/jwt";
import { refreshTokens } from "../drizzle/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../config/db/database";
import type { User } from "../modules/auth/auth.types";

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const ACCESS_TOKEN_TTL_MS = parseInt(process.env.ACCESS_TOKEN_TTL_MS || "900000", 10); // 15 minutes in milliseconds

const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "30d";
const REFRESH_TOKEN_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_MS || "2592000000", 10); // 30 days in milliseconds
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

// for page route
export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const cookies = new CookieMap(req.headers.cookie ?? "");

  const accessToken = cookies.get(process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token") ?? extractBearer(req);
  const refreshToken = cookies.get(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token");

  // 1. Try the access token first — cheap, no DB hit
  if (accessToken) {
    const payload = await jwtService.verify(accessToken);
    if (payload && (payload.role === "USER" || payload.role === "ADMIN")) {
      req.user = { id: payload.id, email: payload.email, name: payload.name, role: payload.role };
      return next();
    }
  }

  // 2. Access token missing/expired — fall back to refresh token
  if (refreshToken) {
    const userAgent = req.headers["user-agent"];
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress;

    const payload = await new JWTService(REFRESH_TOKEN_TTL).verify(refreshToken);

    if (payload) {
      const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

      const [record] = await db
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date())));

      if (record) {
        // Reuse of an already-revoked token = compromise signal. Kill every active session for this user, not just this one request.
        if (record.revokedAt !== null) {
          await db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(and(eq(refreshTokens.userId, record.userId), isNull(refreshTokens.revokedAt)));

          // TODO: fire an audit/alert event here, e.g. logSecurityEvent({ type: "refresh_token_reuse", userId: record.userId, userAgent, ipAddress });

          // Invalid refresh token
          req.user = undefined;
          return next();
        }

        return db.transaction(async (tx) => {
          // Atomic claim: only proceeds if this exact row is still unrevoked at the moment we revoke it. Closes the race where two concurrent requests with the same token both pass the check above.
          const claimed = await tx
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(and(eq(refreshTokens.id, record.id), isNull(refreshTokens.revokedAt)))
            .returning();

          if (claimed.length === 0) {
            // Lost the race — treat identically to confirmed reuse.
            await tx
              .update(refreshTokens)
              .set({ revokedAt: new Date() })
              .where(and(eq(refreshTokens.userId, record.userId), isNull(refreshTokens.revokedAt)));

            // Invalid refresh token
            req.user = undefined;
            return next();
          }

          const newTokens = await issueTokens({
            id: payload.id,
            name: payload.name,
            email: payload.email,
            role: payload.role,
          });

          await tx.insert(refreshTokens).values({
            userId: payload.id,
            tokenHash: createHash("sha256").update(newTokens.refreshToken.token).digest("hex"),
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            userAgent: userAgent ?? null,
            ipAddress: ipAddress ?? null,
          });

          res.cookie(process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token", newTokens.accessToken.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: newTokens.accessToken.expiresIn, // 15 minutes
          });

          res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token", newTokens.refreshToken.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: newTokens.refreshToken.expiresIn, // 30 days
          });

          req.user = { id: payload.id, email: payload.email, name: payload.name, role: payload.role };
          return next();
        });
      }

      // Invalid refresh token
      req.user = undefined;
      return next();
    }

    // Invalid refresh token
    req.user = undefined;
    return next();
  }

  // No refresh token
  req.user = undefined;
  next();
});

export const authGuard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const origin = req.originalUrl;
  const redirect = `/login${origin !== "/" ? "?redirect=" + origin : ""}`;

  if (!req.user) {
    return res.redirect(redirect);
  }

  next();
});

export const guestGuard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    return res.redirect("/");
  }

  next();
});

async function issueTokens(user: Pick<User, "id" | "name" | "email" | "role">): Promise<{
  accessToken: { token: string; tokenType: string; expiresIn: number };
  refreshToken: { token: string; tokenType: string; expiresIn: number };
}> {
  const tokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const [accessTokenValue, refreshTokenValue] = await Promise.all([
    new JWTService(ACCESS_TOKEN_TTL).sign(tokenPayload),
    new JWTService(REFRESH_TOKEN_TTL).sign(tokenPayload),
  ]);

  return {
    accessToken: {
      token: accessTokenValue,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_TTL_MS,
    },
    refreshToken: {
      token: refreshTokenValue,
      tokenType: "Bearer",
      expiresIn: REFRESH_TOKEN_TTL_MS,
    },
  };
}
