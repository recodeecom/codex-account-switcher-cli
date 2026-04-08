import { z } from "zod";

export const PlanRoleProgressSchema = z.object({
  role: z.string().min(1),
  totalCheckpoints: z.number().int().min(0),
  doneCheckpoints: z.number().int().min(0),
});

export const OpenSpecPlanSummarySchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }),
  roles: z.array(PlanRoleProgressSchema).default([]),
});

export const OpenSpecPlansResponseSchema = z.object({
  entries: z.array(OpenSpecPlanSummarySchema).default([]),
});

export const OpenSpecPlanRoleDetailSchema = z.object({
  role: z.string().min(1),
  totalCheckpoints: z.number().int().min(0),
  doneCheckpoints: z.number().int().min(0),
  tasksMarkdown: z.string(),
  checkpointsMarkdown: z.string().nullable(),
});

export const OpenSpecPlanDetailSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }),
  summaryMarkdown: z.string(),
  checkpointsMarkdown: z.string(),
  roles: z.array(OpenSpecPlanRoleDetailSchema).default([]),
});

export type OpenSpecPlanSummary = z.infer<typeof OpenSpecPlanSummarySchema>;
export type OpenSpecPlansResponse = z.infer<typeof OpenSpecPlansResponseSchema>;
export type OpenSpecPlanDetail = z.infer<typeof OpenSpecPlanDetailSchema>;
