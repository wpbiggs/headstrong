import { z } from "zod";

export const openBadgeAssertionSchema = z.object({
  "@context": z.array(z.string().url()).min(1),
  type: z.literal("Assertion"),
  id: z.string().url(),
  recipient: z.object({
    type: z.literal("email"),
    identity: z.string().email(),
  }),
  badge: z.string().url(),
  issuedOn: z.string().datetime(),
  verification: z.object({
    type: z.literal("HostedBadge"),
  }),
});

export interface OpenBadgesIssuer {
  issueAssertion(input: {
    recipientEmail: string;
    badgeUrl: string;
    assertionUrl: string;
  }): Promise<z.infer<typeof openBadgeAssertionSchema>>;
}
