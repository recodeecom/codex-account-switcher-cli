import { resolveEffectiveAccountStatus } from "@/utils/account-status";
import { ApiError } from "@/lib/api-client";

type UseLocalAccountInput = {
  status: string;
  primaryRemainingPercent: number | null | undefined;
  secondaryRemainingPercent?: number | null | undefined;
  hasSnapshot?: boolean;
  isActiveSnapshot?: boolean;
  hasLiveSession?: boolean;
  hasRecentUsageSignal?: boolean;
  codexSessionCount?: number | null;
};

function hasFiveHourQuota(primaryRemainingPercent: number | null | undefined): boolean {
  return typeof primaryRemainingPercent === "number" && primaryRemainingPercent >= 1;
}

function hasWeeklyQuota(secondaryRemainingPercent: number | null | undefined): boolean {
  if (typeof secondaryRemainingPercent !== "number" || Number.isNaN(secondaryRemainingPercent)) {
    return true;
  }
  return secondaryRemainingPercent >= 1;
}

function isWorkingNow(input: UseLocalAccountInput): boolean {
  const hasLiveSession = input.hasLiveSession ?? false;
  const hasTrackedSession = (input.codexSessionCount ?? 0) > 0;
  return hasLiveSession || hasTrackedSession;
}

export function canUseLocalAccount(input: UseLocalAccountInput): boolean {
  if (!hasWeeklyQuota(input.secondaryRemainingPercent)) {
    return false;
  }
  if (isWorkingNow(input)) {
    return true;
  }
  return (
    resolveEffectiveAccountStatus({
      status: input.status,
      hasSnapshot: input.hasSnapshot,
      isActiveSnapshot: input.isActiveSnapshot,
      hasLiveSession: input.hasLiveSession,
      hasRecentUsageSignal: input.hasRecentUsageSignal,
    }) === "active" &&
    hasFiveHourQuota(input.primaryRemainingPercent) &&
    hasWeeklyQuota(input.secondaryRemainingPercent)
  );
}

export function getUseLocalAccountDisabledReason(input: UseLocalAccountInput): string | null {
  if (!hasWeeklyQuota(input.secondaryRemainingPercent)) {
    return "Need at least 1% weekly quota remaining.";
  }
  if (isWorkingNow(input)) {
    return null;
  }
  if (
    resolveEffectiveAccountStatus({
      status: input.status,
      hasSnapshot: input.hasSnapshot,
      isActiveSnapshot: input.isActiveSnapshot,
      hasLiveSession: input.hasLiveSession,
      hasRecentUsageSignal: input.hasRecentUsageSignal,
    }) !== "active"
  ) {
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
