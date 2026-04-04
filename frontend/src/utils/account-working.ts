import type { AccountSummary } from "@/features/accounts/schemas";

const LIVE_TELEMETRY_STALE_AFTER_MS = 5 * 60 * 1000;

function parseRecordedAtMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestampMs = Date.parse(value);
  if (!Number.isFinite(timestampMs)) return null;
  return timestampMs;
}

function isFreshTimestamp(
  value: string | null | undefined,
  nowMs: number,
): boolean {
  const recordedAtMs = parseRecordedAtMs(value);
  if (recordedAtMs == null) return false;
  return nowMs - recordedAtMs <= LIVE_TELEMETRY_STALE_AFTER_MS;
}

export function hasFreshLiveTelemetry(
  account: Pick<
    AccountSummary,
    | "codexAuth"
    | "codexCurrentTaskPreview"
    | "lastUsageRecordedAtPrimary"
    | "lastUsageRecordedAtSecondary"
  >,
  nowMs: number = Date.now(),
): boolean {
  if (!(account.codexAuth?.hasLiveSession ?? false)) {
    return false;
  }

  if ((account.codexCurrentTaskPreview ?? "").trim().length > 0) {
    return true;
  }

  return (
    isFreshTimestamp(account.lastUsageRecordedAtPrimary, nowMs) ||
    isFreshTimestamp(account.lastUsageRecordedAtSecondary, nowMs)
  );
}

export function isAccountWorkingNow(
  account: Pick<
    AccountSummary,
    | "codexAuth"
    | "codexCurrentTaskPreview"
    | "lastUsageRecordedAtPrimary"
    | "lastUsageRecordedAtSecondary"
  >,
  nowMs: number = Date.now(),
): boolean {
  return hasFreshLiveTelemetry(account, nowMs);
}
