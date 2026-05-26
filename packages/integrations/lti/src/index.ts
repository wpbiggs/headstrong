import { randomUUID } from "node:crypto";
import { readEnv } from "@headstrong/core";
import {
  type LtiConsumer,
  type LtiProvider,
  ltiLaunchContextSchema,
  ltiOidcLoginRequestSchema,
  ltiOidcLoginResponseSchema,
} from "@headstrong/core/integrations";
import { z } from "zod";

const env = readEnv(
  {
    ENABLE_LTI_PROVIDER: z.coerce.boolean().default(false),
    ENABLE_LTI_CONSUMER: z.coerce.boolean().default(false),
    LTI_ISSUER: z.string().url().default("https://platform.example.com"),
    LTI_CLIENT_ID: z.string().min(1).default("headstrong-lti-client"),
    LTI_DEPLOYMENT_ID: z.string().min(1).default("headstrong-deployment"),
    LTI_REDIRECT_URI: z
      .string()
      .url()
      .default("http://localhost:4000/integrations/lti/oidc/callback"),
  },
  process.env,
);

class StubLtiProvider implements LtiProvider {
  async initiateLogin(input: z.infer<typeof ltiOidcLoginRequestSchema>) {
    if (!env.ENABLE_LTI_PROVIDER) {
      throw new Error("LTI provider mode is disabled.");
    }
    const parsed = ltiOidcLoginRequestSchema.parse(input);
    const state = randomUUID();
    const nonce = randomUUID();
    const redirectUrl = new URL(env.LTI_REDIRECT_URI);
    redirectUrl.searchParams.set("state", state);
    redirectUrl.searchParams.set("nonce", nonce);
    redirectUrl.searchParams.set("issuer", parsed.issuer);
    redirectUrl.searchParams.set("login_hint", parsed.login_hint);
    redirectUrl.searchParams.set("target_link_uri", parsed.target_link_uri);
    return ltiOidcLoginResponseSchema.parse({
      redirectUrl: redirectUrl.toString(),
      state,
      nonce,
    });
  }

  async handleCallback(params: URLSearchParams) {
    if (!env.ENABLE_LTI_PROVIDER) {
      throw new Error("LTI provider mode is disabled.");
    }
    return ltiLaunchContextSchema.parse({
      version: "v1",
      issuer: params.get("issuer") ?? env.LTI_ISSUER,
      clientId: env.LTI_CLIENT_ID,
      deploymentId: env.LTI_DEPLOYMENT_ID,
      subject: params.get("login_hint") ?? "stub-user",
      messageType: "LtiResourceLinkRequest",
      targetLinkUri: params.get("target_link_uri") ?? env.LTI_REDIRECT_URI,
      roles: ["Learner"],
    });
  }
}

class StubLtiConsumer implements LtiConsumer {
  async createLaunchRequest(context: z.infer<typeof ltiLaunchContextSchema>) {
    if (!env.ENABLE_LTI_CONSUMER) {
      throw new Error("LTI consumer mode is disabled.");
    }
    const parsed = ltiLaunchContextSchema.parse(context);
    return {
      iss: parsed.issuer,
      client_id: parsed.clientId,
      deployment_id: parsed.deploymentId,
      login_hint: parsed.subject,
      target_link_uri: parsed.targetLinkUri,
    };
  }
}

export function createLtiProvider() {
  return new StubLtiProvider();
}

export function createLtiConsumer() {
  return new StubLtiConsumer();
}
