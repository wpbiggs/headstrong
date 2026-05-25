import { readEnv } from "@headstrong/core";
import { z } from "zod";

export const env = readEnv(
  {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_API_URL: z.string().url(),
  },
  process.env,
);
