import { z } from "zod";

export const roleSchema = z.enum([
  "student",
  "parent",
  "educator",
  "expert",
  "admin",
]);

export type Role = z.infer<typeof roleSchema>;
