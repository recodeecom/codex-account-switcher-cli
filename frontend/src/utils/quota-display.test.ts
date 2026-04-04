import { describe, expect, it } from "vitest";

import { normalizeRemainingPercentForDisplay } from "@/utils/quota-display";

describe("normalizeRemainingPercentForDisplay", () => {
  it("keeps original value for 5h window when reset is already past", () => {
    const result = normalizeRemainingPercentForDisplay({
      windowKey: "primary",
      remainingPercent: 2,
      resetAt: "2026-01-01T00:00:00.000Z",
      nowMs: new Date("2026-01-01T00:00:01.000Z").getTime(),
    });

    expect(result).toBe(2);
  });

  it("keeps original value for 5h window before reset", () => {
    const result = normalizeRemainingPercentForDisplay({
      windowKey: "primary",
      remainingPercent: 2,
      resetAt: "2026-01-01T00:10:00.000Z",
      nowMs: new Date("2026-01-01T00:00:01.000Z").getTime(),
    });

    expect(result).toBe(2);
  });

  it("keeps original value for weekly window", () => {
    const result = normalizeRemainingPercentForDisplay({
      windowKey: "secondary",
      remainingPercent: 88,
      resetAt: "2026-01-01T00:00:00.000Z",
      nowMs: new Date("2026-01-01T00:00:01.000Z").getTime(),
    });

    expect(result).toBe(88);
  });

  it("keeps null values as null", () => {
    const result = normalizeRemainingPercentForDisplay({
      windowKey: "primary",
      remainingPercent: null,
      resetAt: "2026-01-01T00:00:00.000Z",
      nowMs: new Date("2026-01-01T00:00:01.000Z").getTime(),
    });

    expect(result).toBeNull();
  });

  it("hides live quota values when telemetry timestamp is stale", () => {
    const result = normalizeRemainingPercentForDisplay({
      windowKey: "primary",
      remainingPercent: 97,
      resetAt: "2026-01-01T02:00:00.000Z",
      hasLiveSession: true,
      lastRecordedAt: "2026-01-01T00:00:00.000Z",
      nowMs: new Date("2026-01-01T00:10:00.000Z").getTime(),
    });

    expect(result).toBeNull();
  });

  it("keeps live quota values when telemetry timestamp is fresh", () => {
    const result = normalizeRemainingPercentForDisplay({
      windowKey: "primary",
      remainingPercent: 77,
      resetAt: "2026-01-01T02:00:00.000Z",
      hasLiveSession: true,
      lastRecordedAt: "2026-01-01T00:09:00.000Z",
      nowMs: new Date("2026-01-01T00:10:00.000Z").getTime(),
    });

    expect(result).toBe(77);
  });

  it("hides live quota values when timestamp is missing", () => {
    const result = normalizeRemainingPercentForDisplay({
      windowKey: "secondary",
      remainingPercent: 47,
      resetAt: "2026-01-07T02:00:00.000Z",
      hasLiveSession: true,
      lastRecordedAt: null,
      nowMs: new Date("2026-01-01T00:10:00.000Z").getTime(),
    });

    expect(result).toBeNull();
  });
});
