type QuotaDisplayInput = {
  windowKey: "primary" | "secondary";
  remainingPercent: number | null;
  resetAt: string | null | undefined;
  hasLiveSession?: boolean;
  lastRecordedAt?: string | null;
  staleAfterMs?: number;
  nowMs?: number;
};

const DEFAULT_LIVE_STALE_AFTER_MS = 6 * 60 * 1000;

function parseRecordedAtMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestampMs = Date.parse(value);
  if (!Number.isFinite(timestampMs)) return null;
  return timestampMs;
}

export function normalizeRemainingPercentForDisplay({
  remainingPercent,
  hasLiveSession = false,
  lastRecordedAt,
  staleAfterMs = DEFAULT_LIVE_STALE_AFTER_MS,
  nowMs = Date.now(),
}: QuotaDisplayInput): number | null {
  if (!hasLiveSession) {
    return remainingPercent;
  }
  if (remainingPercent === null) {
    return null;
  }
  const recordedAtMs = parseRecordedAtMs(lastRecordedAt);
  if (recordedAtMs === null) {
    return null;
  }
  const ageMs = nowMs - recordedAtMs;
  if (ageMs > staleAfterMs) {
    return null;
  }
  return remainingPercent;
}
