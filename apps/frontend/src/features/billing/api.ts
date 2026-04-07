import { get, put } from "@/lib/api-client";
import {
  BillingAccountsResponseSchema,
  BillingAccountsUpdateRequestSchema,
} from "@/features/billing/schemas";

const BILLING_PATH = "/api/billing";

export function getBillingAccounts() {
  return get(BILLING_PATH, BillingAccountsResponseSchema);
}

export function updateBillingAccounts(payload: unknown) {
  const validated = BillingAccountsUpdateRequestSchema.parse(payload);
  return put(BILLING_PATH, BillingAccountsResponseSchema, { body: validated });
}
