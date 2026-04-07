import { z } from "zod";

export const BillingMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  role: z.enum(["Owner", "Member"]),
  seatType: z.enum(["ChatGPT", "Codex"]),
  dateAdded: z.string(),
});

export const BillingCycleSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
});

export const BillingAccountSchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  billingCycle: BillingCycleSchema,
  chatgptSeatsInUse: z.number().int().nonnegative(),
  codexSeatsInUse: z.number().int().nonnegative(),
  members: z.array(BillingMemberSchema),
});

export const BillingAccountsResponseSchema = z.object({
  accounts: z.array(BillingAccountSchema),
});

export const BillingAccountsUpdateRequestSchema = z.object({
  accounts: z.array(BillingAccountSchema),
});

export type BillingMember = z.infer<typeof BillingMemberSchema>;
export type BillingCycle = z.infer<typeof BillingCycleSchema>;
export type BillingAccount = z.infer<typeof BillingAccountSchema>;
export type BillingAccountsResponse = z.infer<typeof BillingAccountsResponseSchema>;
export type BillingAccountsUpdateRequest = z.infer<typeof BillingAccountsUpdateRequestSchema>;
