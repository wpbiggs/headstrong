import postgres from "postgres";
import { createPreviewApp } from "./preview-app";

export default {
  async fetch(request, bindings, ctx) {
    // Separate entry point: never imports the Node server or legacy integration routes.
    if (
      bindings.PREVIEW_SYNTHETIC_DATA_ONLY !== "true" ||
      !bindings.JWT_SECRET ||
      bindings.JWT_SECRET.length < 32
    ) {
      return Response.json(
        { error: "Private preview is not configured." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const client = postgres(bindings.HYPERDRIVE.connectionString, {
      max: 2,
      fetch_types: false,
      prepare: true,
      connect_timeout: 10,
    });
    try {
      const [configuration] =
        await client`select synthetic_only from headstrong_private.preview_configuration
        where singleton = true and current_user = 'headstrong_preview_api'`;
      if (!configuration?.synthetic_only)
        throw new Error("Preview database not provisioned.");
      return await createPreviewApp(client, bindings.JWT_SECRET, (key) =>
        bindings.API_RATE_LIMITER.limit({ key }),
      ).fetch(request);
    } catch {
      return Response.json(
        { error: "Preview unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      ctx.waitUntil(client.end({ timeout: 5 }));
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
