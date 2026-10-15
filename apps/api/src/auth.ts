import { randomUUID } from "node:crypto";
import type { Role, Session } from "@headstrong/core";
import { sessionSchema } from "@headstrong/core";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import {
  type AuthRepository,
  createAuthRepository,
} from "./repositories/auth-repository";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function createSession(
  userId: string,
  email: string,
  role: Role,
): Promise<Session> {
  return sessionSchema.parse({
    sub: userId,
    email,
    role,
    sessionId: randomUUID(),
  });
}

export async function signSession(
  session: Session,
  repository: AuthRepository = createAuthRepository(),
) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("headstrong")
    .setAudience("headstrong-api")
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);
  await repository.register(session, expiresAt);
  return token;
}

export async function verifySession(
  token: string,
  repository: AuthRepository = createAuthRepository(),
) {
  const result = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: "headstrong",
    audience: "headstrong-api",
    requiredClaims: ["exp", "iat"],
  });
  const session = sessionSchema.parse(result.payload);
  if (!(await repository.isActive(session)))
    throw new Error("Session expired, revoked or account changed.");
  return session;
}
