import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

// vinext collects NEXT_PUBLIC_* from process.env in its config hook, which can
// override Vite's define entries below. Pin the deployment boundary before that
// collection: a loopback browser-fixture environment must never ship to clients.
// This changes only this Vite process, not shell configuration or fixture config.
process.env.NEXT_PUBLIC_API_URL = "/api";
process.env.NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS = "true";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
  define: {
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("/api"),
    "process.env.NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS": JSON.stringify("true"),
  },
});
