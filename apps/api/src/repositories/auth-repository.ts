import type { Session } from "@headstrong/core";
import { type DatabaseClient, getDefaultDatabase } from "../db";

export function createAuthRepository(
  client: DatabaseClient = getDefaultDatabase(),
) {
  return {
    async register(session: Session, expiresAt: Date) {
      // Role/email come from the existing account, never from a bearer-token request.
      const rows = await client`
        insert into auth_sessions (id, user_id, expires_at)
        select ${session.sessionId}, id, ${expiresAt} from users
        where id = ${session.sub} and email = ${session.email} and role = ${session.role}
        returning id
      `;
      if (!rows.length)
        throw new Error("Account is unavailable or its role changed.");
    },
    async isActive(session: Session) {
      const rows = await client`
        select auth_sessions.id from auth_sessions join users on users.id = auth_sessions.user_id
        where auth_sessions.id = ${session.sessionId} and users.id = ${session.sub}
          and users.email = ${session.email} and users.role = ${session.role}
          and revoked_at is null and expires_at > now()
      `;
      return rows.length > 0;
    },
    async revoke(sessionId: string) {
      await client`update auth_sessions set revoked_at = coalesce(revoked_at, now()) where id = ${sessionId}`;
    },
    async revokeUser(userId: string) {
      await client`update auth_sessions set revoked_at = coalesce(revoked_at, now()) where user_id = ${userId}`;
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
