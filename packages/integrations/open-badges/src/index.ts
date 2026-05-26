import { readEnv } from "@headstrong/core";
import {
  type OpenBadgesIssuer,
  openBadgeAssertionSchema,
} from "@headstrong/core/integrations";
import { z } from "zod";

const env = readEnv(
  {
    ENABLE_OPEN_BADGES: z.coerce.boolean().default(false),
    OPEN_BADGES_ISSUER_URL: z
      .string()
      .url()
      .default("https://badges.example.com"),
    OPEN_BADGES_ISSUER_NAME: z.string().min(1).default("Headstrong"),
  },
  process.env,
);

class StubOpenBadgesIssuer implements OpenBadgesIssuer {
  async issueAssertion(input: {
    recipientEmail: string;
    badgeUrl: string;
    assertionUrl: string;
  }) {
    if (!env.ENABLE_OPEN_BADGES) {
      throw new Error("Open Badges integration is disabled.");
    }
    return openBadgeAssertionSchema.parse({
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: "Assertion",
      id: input.assertionUrl,
      recipient: {
        type: "email",
        identity: input.recipientEmail,
      },
      badge: input.badgeUrl,
      issuedOn: new Date().toISOString(),
      verification: {
        type: "HostedBadge",
      },
    });
  }
}

export function createOpenBadgesIssuer() {
  return new StubOpenBadgesIssuer();
}
