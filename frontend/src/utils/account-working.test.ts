import { describe, expect, it } from "vitest";

import { createAccountSummary } from "@/test/mocks/factories";
import { isAccountWorkingNow } from "@/utils/account-working";

describe("isAccountWorkingNow", () => {
  it("returns true when codex auth reports a live session with fresh telemetry", () => {
    const now = new Date("2026-04-04T12:00:00.000Z");
    const account = createAccountSummary({
      codexAuth: {
        hasSnapshot: true,
        snapshotName: "secondary",
        activeSnapshotName: "main",
        isActiveSnapshot: false,
        hasLiveSession: true,
      },
      lastUsageRecordedAtPrimary: "2026-04-04T11:57:00.000Z",
    });
    expect(isAccountWorkingNow(account, now.getTime())).toBe(true);
  });

  it("returns true when a live process session count is present", () => {
    const account = createAccountSummary({
      codexAuth: {
        hasSnapshot: true,
        snapshotName: "main",
        activeSnapshotName: "main",
        isActiveSnapshot: true,
        hasLiveSession: false,
      },
      codexLiveSessionCount: 2,
      lastUsageRecordedAtPrimary: null,
      lastUsageRecordedAtSecondary: null,
    });

    expect(isAccountWorkingNow(account)).toBe(true);
  });

  it("returns false when account is active snapshot without live sessions", () => {
    const account = createAccountSummary({
      codexAuth: {
        hasSnapshot: true,
        snapshotName: "main",
        activeSnapshotName: "main",
        isActiveSnapshot: true,
        hasLiveSession: false,
      },
      lastUsageRecordedAtPrimary: null,
      lastUsageRecordedAtSecondary: null,
    });
    expect(isAccountWorkingNow(account)).toBe(false);
  });

  it("returns false when live telemetry is stale", () => {
    const now = new Date("2026-04-04T12:00:00.000Z");
    const account = createAccountSummary({
      codexAuth: {
        hasSnapshot: true,
        snapshotName: "secondary",
        activeSnapshotName: "main",
        isActiveSnapshot: false,
        hasLiveSession: true,
      },
      lastUsageRecordedAtPrimary: "2026-04-04T11:45:00.000Z",
      lastUsageRecordedAtSecondary: "2026-04-04T11:40:00.000Z",
    });
    expect(isAccountWorkingNow(account, now.getTime())).toBe(false);
  });

  it("returns false when none of the working conditions apply", () => {
    const account = createAccountSummary({
      codexAuth: {
        hasSnapshot: true,
        snapshotName: "secondary",
        activeSnapshotName: "main",
        isActiveSnapshot: false,
        hasLiveSession: false,
      },
      lastUsageRecordedAtPrimary: null,
      lastUsageRecordedAtSecondary: null,
    });
    expect(isAccountWorkingNow(account)).toBe(false);
  });
});
