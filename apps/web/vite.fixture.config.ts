import vinext from "vinext";
import { defineConfig } from "vite";

// Loopback-only renderer/browser fixture. No cloud bindings, Access bypass or deployment output.
export default defineConfig({
  plugins: [vinext()],
  define: {
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("http://127.0.0.1:4000"),
    "process.env.NEXT_PUBLIC_ENABLE_LEARNING_JOURNEYS": JSON.stringify("true"),
  },
});
