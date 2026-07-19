import { createHash } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { JWTService } from "../../utils/jwt";
import { AppError } from "../../utils/app-error";
import { PasswordHasher } from "../../utils/password";
import type { Database } from "../../config/db/database";
import { refreshTokens, users } from "../../drizzle/schema";
import type { LoginData, NewUser, User } from "./auth.types";

export class AuthService {
  private ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
  private ACCESS_TOKEN_TTL_MS = parseInt(process.env.ACCESS_TOKEN_TTL_MS || "900000", 10); // 15 minutes in milliseconds

  private REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "30d";
  private REFRESH_TOKEN_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_MS || "2592000000", 10); // 30 days in milliseconds

  constructor(private db: Database) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async signup(data: NewUser, userAgent: string | undefined, ipAddress: string | undefined) {
    const existingUser = await this.db.select().from(users).where(eq(users.email, data.email)).limit(1);

    if (existingUser.length > 0) {
      throw new AppError(409, "User already exists");
    }

    const hashedPassword = await new PasswordHasher().hash(data.password);

    const [user] = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        hashedPassword,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!user) {
      throw new AppError(500, "Failed to create user");
    }

    const tokens = await this.issueTokens({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: this.hashToken(tokens.refreshToken.token),
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL_MS),
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    return {
      user,
      ...tokens,
    };
  }

  async login(data: LoginData, userAgent: string | undefined, ipAddress: string | undefined) {
    const [user] = await this.db.select().from(users).where(eq(users.email, data.email)).limit(1);

    if (!user || !(await new PasswordHasher().compare(data.password, user.hashedPassword))) {
      throw new AppError(401, "Invalid credentials");
    }

    const tokens = await this.issueTokens({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: this.hashToken(tokens.refreshToken.token),
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL_MS),
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt)));
  }

  async logoutAll(userId: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  async refreshToken(refreshToken: string, userAgent: string | undefined, ipAddress: string | undefined) {
    const payload = await new JWTService(this.REFRESH_TOKEN_TTL).verify(refreshToken);

    if (!payload) {
      throw new AppError(401, "Invalid refresh token");
    }

    const refreshTokenHash = this.hashToken(refreshToken);

    const [record] = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, refreshTokenHash), gt(refreshTokens.expiresAt, new Date())));

    if (!record) {
      throw new AppError(401, "Invalid refresh token");
    }

    // Reuse of an already-revoked token = compromise signal. Kill every active session for this user, not just this one request.
    if (record.revokedAt !== null) {
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, record.userId), isNull(refreshTokens.revokedAt)));

      // TODO: fire an audit/alert event here, e.g. logSecurityEvent({ type: "refresh_token_reuse", userId: record.userId, userAgent, ipAddress });

      throw new AppError(401, "Invalid refresh token");
    }

    return this.db.transaction(async (tx) => {
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

        throw new AppError(401, "Invalid refresh token");
      }

      const newTokens = await this.issueTokens({
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      });

      await tx.insert(refreshTokens).values({
        userId: payload.id,
        tokenHash: this.hashToken(newTokens.refreshToken.token),
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL_MS),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      });

      return newTokens;
    });
  }

  private async issueTokens(user: Pick<User, "id" | "name" | "email" | "role">): Promise<{
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
      new JWTService(this.ACCESS_TOKEN_TTL).sign(tokenPayload),
      new JWTService(this.REFRESH_TOKEN_TTL).sign(tokenPayload),
    ]);

    return {
      accessToken: {
        token: accessTokenValue,
        tokenType: "Bearer",
        expiresIn: this.ACCESS_TOKEN_TTL_MS,
      },
      refreshToken: {
        token: refreshTokenValue,
        tokenType: "Bearer",
        expiresIn: this.REFRESH_TOKEN_TTL_MS,
      },
    };
  }
}
