import "dotenv/config";
import { readEnv } from "@headstrong/core";
import { z } from "zod";

export const env = readEnv(
  {
    API_HOST: z.string().min(1),
    API_PORT: z.coerce.number().int().positive(),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
  },
  process.env,
);
