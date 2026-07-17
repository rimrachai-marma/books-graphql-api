import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface TokenPayload {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

export class JWTService {
  private readonly secret: Uint8Array;
  private readonly expiresIn: string;
  private readonly alg = "HS256";

  constructor(expiresIn: string = "15m", secret: string = process.env.JWT_SECRET as string) {
    if (!secret) {
      throw new Error("JWT secret is required");
    }
    this.secret = new TextEncoder().encode(secret);
    this.expiresIn = expiresIn;
  }

  async sign(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: this.alg })
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.secret);
  }

  async verify(token: string): Promise<(TokenPayload & JWTPayload) | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: [this.alg],
      });

      if (!this.isValidPayload(payload)) {
        throw new Error("Invalid token payload shape");
      }

      return payload;
    } catch {
      return null;
    }
  }

  private isValidPayload(payload: JWTPayload): payload is TokenPayload & JWTPayload {
    return (
      typeof payload.id === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string" &&
      (payload.role === "USER" || payload.role === "ADMIN")
    );
  }
}

export const jwtService = new JWTService();
