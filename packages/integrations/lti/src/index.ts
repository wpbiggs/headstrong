import { environmentBooleanSchema, readEnv } from "@headstrong/core";
import {
  type LtiConsumer,
  type LtiProvider,
  ltiLaunchContextSchema,
  ltiOidcLoginRequestSchema,
  type ltiOidcLoginResponseSchema,
  type ltiPlatformConfigurationSchema,
} from "@headstrong/core/integrations";
import { z } from "zod";

function readConfiguration() {
  return readEnv(
    {
      ENABLE_LTI_PROVIDER: environmentBooleanSchema.default(false),
      ENABLE_LTI_CONSUMER: environmentBooleanSchema.default(false),
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
}

class StubLtiProvider implements LtiProvider {
  constructor(private readonly env = readConfiguration()) {}
  async discoverPlatform(
    issuer: string,
  ): Promise<z.infer<typeof ltiPlatformConfigurationSchema>> {
    // No issuer-controlled egress until platform registration and SSRF protection exist.
    z.string().url().parse(issuer);
    throw new Error(
      "LTI discovery is unavailable: verified platform registration is required.",
    );
  }

  async initiateLogin(
    input: z.infer<typeof ltiOidcLoginRequestSchema>,
  ): Promise<z.infer<typeof ltiOidcLoginResponseSchema>> {
    if (!this.env.ENABLE_LTI_PROVIDER) {
      throw new Error("LTI provider mode is disabled.");
    }
    ltiOidcLoginRequestSchema.parse(input);
    throw new Error(
      "LTI launch is unavailable: verified JWT/JWKS and single-use nonce/state are required.",
    );
  }

  async handleCallback(
    params: URLSearchParams,
  ): Promise<z.infer<typeof ltiLaunchContextSchema>> {
    if (!this.env.ENABLE_LTI_PROVIDER) {
      throw new Error("LTI provider mode is disabled.");
    }
    void params;
    throw new Error(
      "LTI launch is unavailable: verified JWT/JWKS and single-use nonce/state are required.",
    );
  }
}

class StubLtiConsumer implements LtiConsumer {
  constructor(private readonly env = readConfiguration()) {}
  async createLaunchRequest(context: z.infer<typeof ltiLaunchContextSchema>) {
    if (!this.env.ENABLE_LTI_CONSUMER) {
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
