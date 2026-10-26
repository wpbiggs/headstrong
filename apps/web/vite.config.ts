import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

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
