import { randomUUID } from "node:crypto";
import type { Role, Session } from "@headstrong/core";
import { sessionSchema } from "@headstrong/core";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

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

export async function signSession(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string) {
  const result = await jwtVerify(token, secret);
  return sessionSchema.parse(result.payload);
}
