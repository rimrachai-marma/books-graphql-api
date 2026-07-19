import type { Request, Response, NextFunction } from "express";

import { AuthService } from "./auth.service";
import { db } from "../../config/db/database";
import { AppError } from "../../utils/app-error";
import asyncHandler from "../../middleware/asyncHandler";
import { CookieMap } from "bun";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(db);
  }

  signup = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;
    const userAgent = req.headers["user-agent"];
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress;

    const result = await this.authService.signup({ name, email, password }, userAgent, ipAddress);

    res.cookie(process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token", result.accessToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: result.accessToken.expiresIn, // 15 minutes
    });

    res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token", result.refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: result.refreshToken.expiresIn, // 30 days
    });

    res.status(201).json({
      status: "success",
      message: "User created successfully.",
      data: {
        user: result.user,
        accessToken: {
          token: result.accessToken.token,
          tokenType: result.accessToken.tokenType,
          expiresIn: result.accessToken.expiresIn, // 15 minutes
        },
        refreshToken: {
          token: result.refreshToken.token,
          tokenType: result.refreshToken.tokenType,
          expiresIn: result.refreshToken.expiresIn, // 30 days
        },
      },
    });
  });

  login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    const userAgent = req.headers["user-agent"];
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress;

    const result = await this.authService.login({ email, password }, userAgent, ipAddress);

    res.cookie(process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token", result.accessToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: result.accessToken.expiresIn, // 15 minutes
    });

    res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token", result.refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: result.refreshToken.expiresIn, // 30 days
    });

    res.json({
      status: "success",
      message: "User logged in successfully.",
      data: {
        user: result.user,
        accessToken: {
          token: result.accessToken.token,
          tokenType: result.accessToken.tokenType,
          expiresIn: result.accessToken.expiresIn, // 15 minutes
        },
        refreshToken: {
          token: result.refreshToken.token,
          tokenType: result.refreshToken.tokenType,
          expiresIn: result.refreshToken.expiresIn, // 30 days
        },
      },
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const cookies = new CookieMap(req.headers.cookie ?? "");
    const refreshToken = cookies.get(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token");

    if (refreshToken) {
      await this.authService.logout(refreshToken).catch(() => {});
    }

    res.clearCookie(process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token");
    res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token");

    res.json({ status: "success", message: "Logged out successfully." });
  });

  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.logoutAll(req.user!.id);

    res.clearCookie(process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token");
    res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token");

    res.json({ status: "success", message: "Logged out of all devices successfully." });
  });

  refresh = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const cookies = new CookieMap(req.headers.cookie ?? "");

    const refreshToken: string | undefined =
      cookies.get(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token") ?? undefined;

    if (!refreshToken) {
      throw new AppError(401, "Refresh token is missing");
    }

    const userAgent = req.headers["user-agent"];
    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress;

    const result = await this.authService.refreshToken(refreshToken, userAgent, ipAddress);

    res.cookie(process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token", result.accessToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: result.accessToken.expiresIn, // 15 minutes
    });

    res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token", result.refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: result.refreshToken.expiresIn, // 30 days
    });

    res.json({
      status: "success",
      message: "Tokens refreshed successfully.",
      data: {
        accessToken: {
          token: result.accessToken.token,
          tokenType: result.accessToken.tokenType,
          expiresIn: result.accessToken.expiresIn,
        },
        refreshToken: {
          token: result.refreshToken.token,
          tokenType: result.refreshToken.tokenType,
          expiresIn: result.refreshToken.expiresIn,
        },
      },
    });
  });

  verify = asyncHandler(async (req: Request, res: Response) => {
    res.json({
      status: "success",
      message: "Session is valid.",
      data: req.user,
    });
  });
}
