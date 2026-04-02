import { normalizeStatus } from "@/utils/account-status";
import { ApiError } from "@/lib/api-client";

type UseLocalAccountInput = {
  status: string;
  primaryRemainingPercent: number | null | undefined;
};

function hasFiveHourQuota(primaryRemainingPercent: number | null | undefined): boolean {
  return typeof primaryRemainingPercent === "number" && primaryRemainingPercent >= 1;
}

export function canUseLocalAccount(input: UseLocalAccountInput): boolean {
  return normalizeStatus(input.status) === "active" && hasFiveHourQuota(input.primaryRemainingPercent);
}

export function getUseLocalAccountDisabledReason(input: UseLocalAccountInput): string | null {
  if (normalizeStatus(input.status) !== "active") {
    return "Account must be active.";
  }
  if (!hasFiveHourQuota(input.primaryRemainingPercent)) {
    return "Need at least 1% 5h quota remaining.";
  }
  return null;
}

export function isCodexAuthSnapshotMissingError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "codex_auth_snapshot_not_found";
}
