import { env } from "cloudflare:workers";
import handler from "vinext/server/app-router-entry";
import { verifyPreviewAccess } from "./access";
import { previewGateway } from "./gateway";

// Custom entry for access enforcement and the same-origin API gateway, not for
// locating bindings. All bindings come from the native cloudflare:workers module.
export default {
  fetch(request, _bindings, ctx) {
    return previewGateway(request, {
      enabled: env.PREVIEW_SYNTHETIC_DATA_ONLY === "true",
      verify: (value) =>
        verifyPreviewAccess(value, env.ACCESS_ISSUER, env.ACCESS_AUDIENCE),
      limit: (key) => env.EDGE_RATE_LIMITER.limit({ key }),
      api: (value) => env.API.fetch(value),
      web: (value) => handler.fetch(value, env, ctx),
    });
  },
} satisfies ExportedHandler<Cloudflare.Env>;
