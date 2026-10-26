import type { Session } from "@headstrong/core";
import type { AuthRepository } from "../src/repositories/auth-repository";

export function memoryAuthRepository(): AuthRepository {
  const sessions = new Map<string, Session>();
  return {
    async register(session) {
      sessions.set(session.sessionId, session);
    },
    async isActive(session) {
      return sessions.has(session.sessionId);
    },
    async revoke(id) {
      sessions.delete(id);
    },
    async revokeUser(userId) {
      for (const [id, session] of sessions)
        if (session.sub === userId) sessions.delete(id);
    },
  };
}
