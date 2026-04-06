import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  AccountCard,
  type AccountCardProps,
} from "@/features/dashboard/components/account-card";
import type { AccountSummary, UsageWindow } from "@/features/dashboard/schemas";
import { buildDuplicateAccountIdSet } from "@/utils/account-identifiers";
import {
  getMergedQuotaRemainingPercent,
  getRawQuotaWindowFallback,
  hasActiveCliSessionSignal,
  hasRecentUsageSignal,
  hasFreshLiveTelemetry,
  isAccountWorkingNow,
  selectStableRemainingPercent,
} from "@/utils/account-working";
import { resolveEffectiveAccountStatus } from "@/utils/account-status";
import { formatWindowLabel } from "@/utils/formatters";
import { normalizeRemainingPercentForDisplay } from "@/utils/quota-display";

const RECENT_LAST_SEEN_SORT_WINDOW_MS = 30 * 60 * 1000;
const WEEKLY_DEPLETED_SORT_THRESHOLD_PERCENT = 5;
const QUOTA_SORT_BUCKET_PERCENT = 5;
const ACCOUNT_CARDS_CLOCK_TICK_MS = 5_000;

type OtherAccountsSortMode =
  | "available-first"
  | "usage-limit-available-first"
  | "stable";

function roundAveragePercent(
  values: Array<number | null | undefined>,
): number | null {
  const normalized = values
    .filter((value): value is number => value != null)
    .map((value) => Math.max(0, Math.min(100, value)));

  if (normalized.length === 0) {
    return null;
  }

  const average =
    normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
  return Math.round(average);
}

function compareNullableNumberDesc(left: number | null, right: number | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return right - left;
}

function compareNullableNumberAsc(left: number | null, right: number | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left - right;
}

function parseTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeNearZeroQuotaPercent(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  if (
    clamped > 0 &&
    clamped < WEEKLY_DEPLETED_SORT_THRESHOLD_PERCENT
  ) {
    return 0;
  }
  return clamped;
}

function bucketizeQuotaPercent(value: number | null): number | null {
  if (value == null) {
    return null;
  }
  return (
    Math.floor(normalizeNearZeroQuotaPercent(value) / QUOTA_SORT_BUCKET_PERCENT) *
    QUOTA_SORT_BUCKET_PERCENT
  );
}

function resolveSortableRemainingPercent(
  account: AccountSummary,
  windowKey: "primary" | "secondary",
  nowMs: number,
): number | null {
  const mergedRemainingPercent = getMergedQuotaRemainingPercent(account, windowKey);
  const deferredQuotaFallback = getRawQuotaWindowFallback(account, windowKey);
  const baselineRemainingPercent =
    windowKey === "primary"
      ? account.usage?.primaryRemainingPercent
      : account.usage?.secondaryRemainingPercent;
  const baselineResetAt =
    windowKey === "primary" ? account.resetAtPrimary : account.resetAtSecondary;
  const baselineRecordedAt =
    windowKey === "primary"
      ? account.lastUsageRecordedAtPrimary
      : account.lastUsageRecordedAtSecondary;
  const hasLiveSession = hasFreshLiveTelemetry(account, nowMs);

  const remainingPercentRaw =
    mergedRemainingPercent ??
    selectStableRemainingPercent({
      fallbackRemainingPercent: deferredQuotaFallback?.remainingPercent,
      fallbackResetAt: deferredQuotaFallback?.resetAt,
      baselineRemainingPercent,
      baselineResetAt,
    });

  const effectiveResetAt = deferredQuotaFallback?.resetAt ?? baselineResetAt ?? null;
  const effectiveRecordedAt =
    deferredQuotaFallback?.recordedAt ?? baselineRecordedAt ?? null;

  return normalizeRemainingPercentForDisplay({
    accountKey: account.accountId,
    windowKey,
    remainingPercent: remainingPercentRaw,
    resetAt: effectiveResetAt,
    hasLiveSession,
    lastRecordedAt: effectiveRecordedAt,
    applyCycleFloor: mergedRemainingPercent == null,
  });
}

function resolveSortableResetAtMs(
  account: AccountSummary,
  windowKey: "primary" | "secondary",
): number | null {
  const deferredQuotaFallback = getRawQuotaWindowFallback(account, windowKey);
  const baselineResetAt =
    windowKey === "primary" ? account.resetAtPrimary : account.resetAtSecondary;
  const effectiveResetAt = deferredQuotaFallback?.resetAt ?? baselineResetAt ?? null;
  return parseTimestampMs(effectiveResetAt);
}

function shouldPinWeeklyDepletedAccountToEnd(metrics: {
  primaryResetAtMs: number | null;
  secondaryResetAtMs: number | null;
  secondaryRemaining: number | null;
}): boolean {
  if (metrics.secondaryRemaining == null) {
    return false;
  }
  return normalizeNearZeroQuotaPercent(metrics.secondaryRemaining) <= 0;
}

function sortAccountsByAvailableQuota(
  accounts: AccountSummary[],
  nowMs: number,
): AccountSummary[] {
  const sortMetricsByAccountId = new Map(
    accounts.map((account) => {
      const primaryRemaining = resolveSortableRemainingPercent(
        account,
        "primary",
        nowMs,
      );
      const secondaryRemaining = resolveSortableRemainingPercent(
        account,
        "secondary",
        nowMs,
      );
      return [
        account.accountId,
        {
          primaryRemaining,
          primarySortBucket: bucketizeQuotaPercent(primaryRemaining),
          primaryResetAtMs: resolveSortableResetAtMs(account, "primary"),
          secondaryResetAtMs: resolveSortableResetAtMs(account, "secondary"),
          secondaryRemaining,
          secondarySortBucket: bucketizeQuotaPercent(secondaryRemaining),
          title: account.displayName || account.email || account.accountId,
        },
      ] as const;
    }),
  );

  return [...accounts].sort((left, right) => {
    const leftMetrics = sortMetricsByAccountId.get(left.accountId);
    const rightMetrics = sortMetricsByAccountId.get(right.accountId);
    if (!leftMetrics || !rightMetrics) {
      return left.accountId.localeCompare(right.accountId);
    }

    const leftWeeklyDepletedPinned = shouldPinWeeklyDepletedAccountToEnd(leftMetrics);
    const rightWeeklyDepletedPinned = shouldPinWeeklyDepletedAccountToEnd(rightMetrics);
    if (leftWeeklyDepletedPinned !== rightWeeklyDepletedPinned) {
      return leftWeeklyDepletedPinned ? 1 : -1;
    }
    if (leftWeeklyDepletedPinned && rightWeeklyDepletedPinned) {
      const weeklyResetDiff = compareNullableNumberAsc(
        leftMetrics.secondaryResetAtMs,
        rightMetrics.secondaryResetAtMs,
      );
      if (weeklyResetDiff !== 0) return weeklyResetDiff;
    }

    const primaryDiff = compareNullableNumberDesc(
      leftMetrics.primarySortBucket,
      rightMetrics.primarySortBucket,
    );
    if (primaryDiff !== 0) return primaryDiff;

    const leftPrimaryDepleted =
      leftMetrics.primaryRemaining != null && leftMetrics.primaryRemaining <= 0;
    const rightPrimaryDepleted =
      rightMetrics.primaryRemaining != null && rightMetrics.primaryRemaining <= 0;
    if (leftPrimaryDepleted && rightPrimaryDepleted) {
      const primaryResetDiff = compareNullableNumberAsc(
        leftMetrics.primaryResetAtMs,
        rightMetrics.primaryResetAtMs,
      );
      if (primaryResetDiff !== 0) return primaryResetDiff;
    }

    const secondaryDiff = compareNullableNumberDesc(
      leftMetrics.secondarySortBucket,
      rightMetrics.secondarySortBucket,
    );
    if (secondaryDiff !== 0) return secondaryDiff;

    return leftMetrics.title.localeCompare(rightMetrics.title);
  });
}

function sortAccountsByStableOrder(
  accounts: AccountSummary[],
  stableOrder: Map<string, number>,
): AccountSummary[] {
  return [...accounts].sort((left, right) => {
    const leftRank = stableOrder.get(left.accountId) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = stableOrder.get(right.accountId) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.accountId.localeCompare(right.accountId);
  });
}

function isUsageLimitAvailableAccount(
  account: AccountSummary,
  nowMs: number,
): boolean {
  const primaryRemaining = resolveSortableRemainingPercent(
    account,
    "primary",
    nowMs,
  );
  const secondaryRemaining = resolveSortableRemainingPercent(
    account,
    "secondary",
    nowMs,
  );
  const usageLimitHit =
    account.status === "rate_limited" ||
    account.status === "quota_exceeded" ||
    (primaryRemaining != null &&
      normalizeNearZeroQuotaPercent(primaryRemaining) <= 0);
  const weeklyAvailable =
    secondaryRemaining == null ||
    normalizeNearZeroQuotaPercent(secondaryRemaining) > 0;

  return usageLimitHit && weeklyAvailable;
}

function sortAccountsByUsageLimitAvailableFirst(
  accounts: AccountSummary[],
  nowMs: number,
): AccountSummary[] {
  const usageLimitAvailable: AccountSummary[] = [];
  const otherAccounts: AccountSummary[] = [];

  const orderedByAvailability = sortAccountsByLastSeenAndAvailableQuota(
    accounts,
    nowMs,
  );
  for (const account of orderedByAvailability) {
    if (isUsageLimitAvailableAccount(account, nowMs)) {
      usageLimitAvailable.push(account);
    } else {
      otherAccounts.push(account);
    }
  }

  return [...usageLimitAvailable, ...otherAccounts];
}

function resolveMostRecentUsageRecordedAtMs(account: AccountSummary): number | null {
  const primaryRecordedAt =
    getRawQuotaWindowFallback(account, "primary")?.recordedAt ??
    account.lastUsageRecordedAtPrimary ??
    null;
  const secondaryRecordedAt =
    getRawQuotaWindowFallback(account, "secondary")?.recordedAt ??
    account.lastUsageRecordedAtSecondary ??
    null;
  const primaryRecordedAtMs = parseTimestampMs(primaryRecordedAt);
  const secondaryRecordedAtMs = parseTimestampMs(secondaryRecordedAt);

  if (primaryRecordedAtMs == null && secondaryRecordedAtMs == null) {
    return null;
  }

  return Math.max(primaryRecordedAtMs ?? Number.NEGATIVE_INFINITY, secondaryRecordedAtMs ?? Number.NEGATIVE_INFINITY);
}

function hasRecentLastSeenUsage(
  account: AccountSummary,
  nowMs: number = Date.now(),
): boolean {
  const mostRecentUsageRecordedAtMs = resolveMostRecentUsageRecordedAtMs(account);
  if (mostRecentUsageRecordedAtMs == null) {
    return false;
  }
  return nowMs - mostRecentUsageRecordedAtMs <= RECENT_LAST_SEEN_SORT_WINDOW_MS;
}

function sortAccountsByLastSeenAndAvailableQuota(
  accounts: AccountSummary[],
  nowMs: number = Date.now(),
): AccountSummary[] {
  const weeklyAvailableAccounts: AccountSummary[] = [];
  const weeklyDepletedAccounts: AccountSummary[] = [];

  for (const account of accounts) {
    const weeklyRemaining = resolveSortableRemainingPercent(
      account,
      "secondary",
      nowMs,
    );
    const shouldPinWeeklyDepleted = shouldPinWeeklyDepletedAccountToEnd({
      primaryResetAtMs: resolveSortableResetAtMs(account, "primary"),
      secondaryResetAtMs: resolveSortableResetAtMs(account, "secondary"),
      secondaryRemaining: weeklyRemaining,
    });

    if (shouldPinWeeklyDepleted) {
      weeklyDepletedAccounts.push(account);
    } else {
      weeklyAvailableAccounts.push(account);
    }
  }

  const recentAccounts: AccountSummary[] = [];
  const staleAccounts: AccountSummary[] = [];

  for (const account of weeklyAvailableAccounts) {
    if (hasRecentLastSeenUsage(account, nowMs)) {
      recentAccounts.push(account);
    } else {
      staleAccounts.push(account);
    }
  }

  return [
    ...sortAccountsByAvailableQuota(recentAccounts, nowMs),
    ...sortAccountsByAvailableQuota(staleAccounts, nowMs),
    ...sortAccountsByAvailableQuota(weeklyDepletedAccounts, nowMs),
  ];
}

export type AccountCardsProps = {
  accounts: AccountSummary[];
  primaryWindow: UsageWindow | null;
  secondaryWindow: UsageWindow | null;
  useLocalBusy?: boolean;
  deleteBusy?: boolean;
  onAction?: AccountCardProps["onAction"];
};

function buildRemainingByAccount(
  window: UsageWindow | null,
): Map<string, number> {
  const remainingByAccount = new Map<string, number>();
  if (!window) return remainingByAccount;

  for (const row of window.accounts) {
    if (row.remainingPercentAvg == null) {
      continue;
    }
    remainingByAccount.set(row.accountId, Math.max(0, row.remainingCredits));
  }

  return remainingByAccount;
}

function resolveCardTokensRemaining(
  account: AccountSummary,
  primaryRemainingByAccount: Map<string, number>,
  secondaryRemainingByAccount: Map<string, number>,
): number | null {
  const weeklyOnly =
    account.windowMinutesPrimary == null &&
    account.windowMinutesSecondary != null;
  const primaryRemaining = primaryRemainingByAccount.get(account.accountId);
  const secondaryRemaining = secondaryRemainingByAccount.get(account.accountId);

  if (weeklyOnly && secondaryRemaining != null) {
    return secondaryRemaining;
  }

  if (primaryRemaining != null) {
    return primaryRemaining;
  }

  if (secondaryRemaining != null) {
    return secondaryRemaining;
  }

  return null;
}

export function AccountCards({
  accounts,
  primaryWindow,
  secondaryWindow,
  useLocalBusy = false,
  deleteBusy = false,
  onAction,
}: AccountCardsProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [otherAccountsSortMode, setOtherAccountsSortMode] =
    useState<OtherAccountsSortMode>("available-first");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, ACCOUNT_CARDS_CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const stableAccountOrder = useMemo(
    () =>
      new Map(
        accounts.map((account, index) => [account.accountId, index] as const),
      ),
    [accounts],
  );

  const primaryWindowLabel = formatWindowLabel(
    "primary",
    primaryWindow?.windowMinutes ?? null,
  );
  const duplicateAccountIds = useMemo(
    () => buildDuplicateAccountIdSet(accounts),
    [accounts],
  );
  const primaryRemainingByAccount = useMemo(
    () => buildRemainingByAccount(primaryWindow),
    [primaryWindow],
  );
  const secondaryRemainingByAccount = useMemo(
    () => buildRemainingByAccount(secondaryWindow),
    [secondaryWindow],
  );
  const groupedAccounts = useMemo(() => {
    const working: AccountSummary[] = [];
    const active: AccountSummary[] = [];
    const deactivated: AccountSummary[] = [];

    for (const account of accounts) {
      const hasActiveCliSession = hasActiveCliSessionSignal(account, nowMs);
      const effectiveStatus = resolveEffectiveAccountStatus({
        status: account.status,
        hasSnapshot: account.codexAuth?.hasSnapshot,
        isActiveSnapshot: account.codexAuth?.isActiveSnapshot,
        hasLiveSession: hasActiveCliSession,
        hasRecentUsageSignal:
          (account.codexAuth?.hasSnapshot ?? false) &&
          hasRecentUsageSignal(account, nowMs),
        allowDeactivatedOverride: false,
      });

      if (isAccountWorkingNow(account, nowMs)) {
        working.push(account);
        continue;
      }

      if (effectiveStatus === "deactivated") {
        deactivated.push(account);
      } else {
        active.push(account);
      }
    }

    return {
      working: sortAccountsByAvailableQuota(working, nowMs),
      remaining: [
        ...(otherAccountsSortMode === "available-first"
          ? sortAccountsByLastSeenAndAvailableQuota(active, nowMs)
            : otherAccountsSortMode === "usage-limit-available-first"
              ? sortAccountsByUsageLimitAvailableFirst(active, nowMs)
            : sortAccountsByStableOrder(active, stableAccountOrder)),
        ...(otherAccountsSortMode === "available-first"
          ? sortAccountsByLastSeenAndAvailableQuota(deactivated, nowMs)
          : otherAccountsSortMode === "usage-limit-available-first"
            ? sortAccountsByUsageLimitAvailableFirst(deactivated, nowMs)
            : sortAccountsByStableOrder(
                deactivated,
                stableAccountOrder,
              )),
      ],
    };
  }, [accounts, nowMs, otherAccountsSortMode, stableAccountOrder]);
  const workingSummary = useMemo(() => {
    const liveSessions = groupedAccounts.working.reduce((sum, account) => {
      if (!hasFreshLiveTelemetry(account, nowMs)) {
        return sum;
      }
      return sum + Math.max(account.codexLiveSessionCount ?? 0, 1);
    }, 0);

    return {
      liveSessions,
      avgPrimaryRemaining: roundAveragePercent(
        groupedAccounts.working.map((account) =>
          normalizeRemainingPercentForDisplay({
            accountKey: account.accountId,
            windowKey: "primary",
            remainingPercent: account.usage?.primaryRemainingPercent ?? null,
            resetAt: account.resetAtPrimary ?? null,
            hasLiveSession: hasFreshLiveTelemetry(account, nowMs),
            lastRecordedAt: account.lastUsageRecordedAtPrimary ?? null,
          }),
        ),
      ),
      avgSecondaryRemaining: roundAveragePercent(
        groupedAccounts.working.map((account) =>
          normalizeRemainingPercentForDisplay({
            accountKey: account.accountId,
            windowKey: "secondary",
            remainingPercent: account.usage?.secondaryRemainingPercent ?? null,
            resetAt: account.resetAtSecondary ?? null,
            hasLiveSession: hasFreshLiveTelemetry(account, nowMs),
            lastRecordedAt: account.lastUsageRecordedAtSecondary ?? null,
          }),
        ),
      ),
    };
  }, [groupedAccounts.working, nowMs]);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No accounts connected yet"
        description="Import or authenticate an account to get started."
      />
    );
  }

  const renderGrid = (items: AccountSummary[], keyPrefix: string) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">
      {items.map((account, index) => (
        <div
          key={`${keyPrefix}-${account.accountId}`}
          className={
            keyPrefix === "working"
              ? "animate-working-account-enter"
              : "animate-fade-in-up"
          }
          style={
            keyPrefix === "working"
              ? ({
                  animationDelay: `${index * 85}ms`,
                  animationDuration: `${Math.min(640, 520 + index * 35)}ms`,
                } satisfies CSSProperties)
              : ({
                  animationDelay: `${index * 60}ms`,
                } satisfies CSSProperties)
          }
        >
          <AccountCard
            account={account}
            tokensRemaining={resolveCardTokensRemaining(
              account,
              primaryRemainingByAccount,
              secondaryRemainingByAccount,
            )}
            showTokensRemaining
            showAccountId={duplicateAccountIds.has(account.accountId)}
            useLocalBusy={useLocalBusy}
            deleteBusy={deleteBusy}
            onAction={onAction}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {groupedAccounts.working.length > 0 ? (
        <section className="space-y-4 rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.04] p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                Working now
              </h3>
              <p className="text-xs text-muted-foreground">
                Accounts with active CLI sessions are grouped first so you can
                switch faster.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-cyan-700 dark:text-cyan-300">
                {groupedAccounts.working.length} working
              </span>
              {workingSummary.liveSessions > 0 ? (
                <span className="inline-flex items-center rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-cyan-700 dark:text-cyan-300">
                  {workingSummary.liveSessions} live sessions
                </span>
              ) : null}
              {workingSummary.avgPrimaryRemaining !== null ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                  {primaryWindowLabel} avg {workingSummary.avgPrimaryRemaining}%
                </span>
              ) : null}
              {workingSummary.avgSecondaryRemaining !== null ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                  Weekly avg {workingSummary.avgSecondaryRemaining}%
                </span>
              ) : null}
            </div>
          </div>
          {renderGrid(groupedAccounts.working, "working")}
        </section>
      ) : null}

      {groupedAccounts.remaining.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-0.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Other accounts
              </h3>
              <div className="h-px w-12 bg-border/70 sm:w-24" />
            </div>
            <div
              className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/70 p-1"
              role="group"
              aria-label="Other accounts order"
            >
              <Button
                type="button"
                size="sm"
                variant={
                  otherAccountsSortMode === "available-first"
                    ? "secondary"
                    : "ghost"
                }
                className="h-7 px-2.5 text-[11px]"
                aria-pressed={otherAccountsSortMode === "available-first"}
                onClick={() => {
                  setOtherAccountsSortMode("available-first");
                }}
              >
                Available first
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  otherAccountsSortMode === "usage-limit-available-first"
                    ? "secondary"
                    : "ghost"
                }
                className="h-7 px-2.5 text-[11px]"
                aria-pressed={
                  otherAccountsSortMode === "usage-limit-available-first"
                }
                onClick={() => {
                  setOtherAccountsSortMode("usage-limit-available-first");
                }}
              >
                Usage-limit available
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  otherAccountsSortMode === "stable" ? "secondary" : "ghost"
                }
                className="h-7 px-2.5 text-[11px]"
                aria-pressed={otherAccountsSortMode === "stable"}
                onClick={() => {
                  setOtherAccountsSortMode("stable");
                }}
              >
                Stable order
              </Button>
            </div>
          </div>
          {renderGrid(groupedAccounts.remaining, "remaining")}
        </section>
      ) : null}
    </div>
  );
}
