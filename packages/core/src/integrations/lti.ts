import { z } from "zod";

export const ltiMessageTypeSchema = z.enum([
  "LtiResourceLinkRequest",
  "LtiDeepLinkingRequest",
]);

export const ltiOidcLoginRequestSchema = z.object({
  login_hint: z.string().min(1),
  lti_message_hint: z.string().min(1).optional(),
  target_link_uri: z.string().url(),
  issuer: z.string().url(),
});

export const ltiOidcLoginResponseSchema = z.object({
  redirectUrl: z.string().url(),
  state: z.string().min(1),
  nonce: z.string().min(1),
});

export const ltiLaunchContextSchema = z.object({
  version: z.literal("v1"),
  issuer: z.string().url(),
  clientId: z.string().min(1),
  deploymentId: z.string().min(1),
  subject: z.string().min(1),
  messageType: ltiMessageTypeSchema,
  targetLinkUri: z.string().url(),
  roles: z.array(z.string().min(1)),
});

export const ltiSessionHandoffSchema = z.object({
  launch: ltiLaunchContextSchema,
  session: z.object({
    sub: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(["student", "parent", "educator", "expert", "admin"]),
    sessionId: z.string().uuid(),
  }),
  token: z.string().min(1),
});

export interface LtiProvider {
  initiateLogin(
    input: z.infer<typeof ltiOidcLoginRequestSchema>,
  ): Promise<z.infer<typeof ltiOidcLoginResponseSchema>>;
  handleCallback(
    params: URLSearchParams,
  ): Promise<z.infer<typeof ltiLaunchContextSchema>>;
}

export interface LtiConsumer {
  createLaunchRequest(
    context: z.infer<typeof ltiLaunchContextSchema>,
  ): Promise<Record<string, string>>;
}
