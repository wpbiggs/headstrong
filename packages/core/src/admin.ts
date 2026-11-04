import { z } from "zod";

export const parentStudentLinkSchema = z.object({
  linkId: z.string().min(1),
  parentId: z.string().guid(),
  studentId: z.string().guid(),
  createdAt: z.string().datetime(),
});

export const createParentStudentLinkSchema = z.object({
  parentId: z.string().guid(),
  studentId: z.string().guid(),
});

export const createParentStudentLinksRequestSchema = z
  .object({
    links: z.array(createParentStudentLinkSchema).min(1),
  })
  .or(createParentStudentLinkSchema.transform((link) => ({ links: [link] })));

export const createParentStudentLinksResponseSchema = z.object({
  links: z.array(parentStudentLinkSchema),
});

export const parentStudentLinkListResponseSchema = z.object({
  links: z.array(parentStudentLinkSchema),
});

export type ParentStudentLink = z.infer<typeof parentStudentLinkSchema>;
