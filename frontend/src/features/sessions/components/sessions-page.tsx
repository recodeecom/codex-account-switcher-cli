import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/features/dashboard/components/filters/pagination-controls";
import { getDashboardOverview } from "@/features/dashboard/api";
import { listStickySessions } from "@/features/sticky-sessions/api";
import { Badge } from "@/components/ui/badge";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { cn } from "@/lib/utils";
import { formatLastUsageLabel } from "@/utils/formatters";

const DEFAULT_LIMIT = 25;

type ProgressTone = "upToDate" | "muted" | "pending";

type ActivityRow = {
  rowKey: string;
  accountId: string;
  displayName: string;
  identity: string;
  sourceLabel: string;
  status: "live" | "idle";
  currentTask: string | null;
  progressLabel: string;
  progressTone: ProgressTone;
  codexSessionCount: number;
};

function resolveProgressDisplay(
  isLive: boolean,
  recordedAt: string | null | undefined,
): { label: string; tone: ProgressTone } {
  if (isLive) {
    return { label: "Up to date", tone: "upToDate" };
  }

  const lastSeenLabel = formatLastUsageLabel(recordedAt);
  if (!lastSeenLabel) {
    return { label: "telemetry pending", tone: "pending" };
  }

  const normalized = lastSeenLabel.trim().toLowerCase();
  if (normalized === "last seen now" || /\b0m ago$/.test(normalized)) {
    return { label: "Up to date", tone: "upToDate" };
  }

  return { label: lastSeenLabel, tone: "muted" };
}

function resolveLatestUsageTimestamp(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): string | null {
  const primaryMs = primary ? Date.parse(primary) : Number.NaN;
  const secondaryMs = secondary ? Date.parse(secondary) : Number.NaN;
  const hasPrimary = Number.isFinite(primaryMs) && primaryMs > 0;
  const hasSecondary = Number.isFinite(secondaryMs) && secondaryMs > 0;

  if (!hasPrimary && !hasSecondary) {
    return null;
  }
  if (!hasPrimary) {
    return secondary ?? null;
  }
  if (!hasSecondary) {
    return primary ?? null;
  }

  return primaryMs >= secondaryMs ? primary ?? null : secondary ?? null;
}

export function SessionsPage() {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [searchParams] = useSearchParams();
  const blurred = usePrivacyStore((s) => s.blurred);
  const selectedAccountId = searchParams.get("accountId");

  const sessionsQuery = useQuery({
    queryKey: ["sticky-sessions", "codex-sessions", { offset, limit, activeOnly: true }],
    queryFn: () =>
      listStickySessions({
        kind: "codex_session",
        staleOnly: false,
        activeOnly: true,
        offset,
        limit,
      }),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const entries = sessionsQuery.data?.entries;
  const hasMore = sessionsQuery.data?.hasMore ?? false;

  const stickyActivityRows = useMemo<ActivityRow[]>(() => {
    const rows = (entries ?? []).map((entry) => {
      const progress = resolveProgressDisplay(entry.isActive, entry.taskUpdatedAt ?? entry.updatedAt);
      return {
        rowKey: `sticky:${entry.key}`,
        accountId: entry.accountId,
        displayName: entry.displayName,
        identity: entry.key,
        sourceLabel: "Sticky mapping",
        status: entry.isActive ? ("live" as const) : ("idle" as const),
        currentTask: entry.taskPreview?.trim() || null,
        progressLabel: progress.label,
        progressTone: progress.tone,
        codexSessionCount: 1,
      };
    });

    if (selectedAccountId) {
      return rows.filter((row) => row.accountId === selectedAccountId);
    }

    return rows;
  }, [entries, selectedAccountId]);
  const fallbackActivityRows = useMemo<ActivityRow[]>(() => {
    const rows = (overviewQuery.data?.accounts ?? [])
      .map((account) => {
        const codexSessionCount = Math.max(account.codexTrackedSessionCount ?? 0, 0);
        const hasLiveSession = Boolean(
          account.codexAuth?.hasLiveSession
            ?? (account.codexLiveSessionCount ?? 0) > 0,
        );
        const progress = resolveProgressDisplay(
          hasLiveSession,
          resolveLatestUsageTimestamp(account.lastUsageRecordedAtPrimary, account.lastUsageRecordedAtSecondary),
        );
        return {
          rowKey: `overview:${account.accountId}`,
          accountId: account.accountId,
          displayName: account.displayName,
          identity: "Dashboard overview",
          sourceLabel: `${codexSessionCount} tracked ${codexSessionCount === 1 ? "session" : "sessions"}`,
          status: hasLiveSession ? ("live" as const) : ("idle" as const),
          currentTask: account.codexCurrentTaskPreview?.trim() || null,
          progressLabel: progress.label,
          progressTone: progress.tone,
          codexSessionCount,
        };
      })
      .filter((row) => row.codexSessionCount > 0);

    if (selectedAccountId) {
      return rows.filter((row) => row.accountId === selectedAccountId);
    }
    return rows;
  }, [overviewQuery.data?.accounts, selectedAccountId]);
  const shouldUseFallbackOverview = stickyActivityRows.length === 0 && fallbackActivityRows.length > 0;
  const activityRows = shouldUseFallbackOverview ? fallbackActivityRows : stickyActivityRows;
  const stickyAccountCount = new Set(stickyActivityRows.map((row) => row.accountId)).size;

  const total = shouldUseFallbackOverview
    ? fallbackActivityRows.reduce((sum, row) => sum + row.codexSessionCount, 0)
    : stickyActivityRows.length;
  const accountCount = shouldUseFallbackOverview ? fallbackActivityRows.length : stickyAccountCount;
  const hasSessionRows = total > 0;
  const waitingForOverviewFallback = (sessionsQuery.data?.total ?? 0) === 0 && overviewQuery.isLoading && !overviewQuery.data;
  const isLoading = (sessionsQuery.isLoading && !sessionsQuery.data) || waitingForOverviewFallback;
  const emptyDescription = selectedAccountId
    ? "No Codex sessions were found for the selected account."
    : "Codex sessions will appear here once routed requests create sticky session mappings.";

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only Codex sessions grouped by account.
        </p>
      </div>

      {isLoading ? (
        <div className="py-8">
          <SpinnerBlock />
        </div>
      ) : !hasSessionRows ? (
        <EmptyState
          icon={Pin}
          title="No Codex sessions"
          description={emptyDescription}
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Codex sessions</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{total}</p>
            </div>
            <div className="rounded-xl border bg-card px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Accounts with sessions</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{accountCount}</p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Session activity</p>
                  <p className="text-xs text-muted-foreground">
                    {shouldUseFallbackOverview
                      ? "Sticky mappings are empty, so this view falls back to dashboard overview telemetry."
                      : "Sticky session mappings provide per-session activity telemetry."}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Account</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Session / source</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Current task</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityRows.map((row) => (
                      <TableRow key={row.rowKey}>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {blurred ? <span className="privacy-blur">{row.displayName}</span> : row.displayName}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">{row.accountId}</p>
                        </TableCell>
                        <TableCell>
                          <p
                            className={cn(
                              "max-w-[28rem] truncate text-xs",
                              row.sourceLabel === "Sticky mapping" && "font-mono",
                            )}
                            title={row.identity}
                          >
                            {row.identity}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{row.sourceLabel}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.status === "live" ? "secondary" : "outline"}
                            className={cn(
                              "text-[11px]",
                              row.status === "live" && "font-semibold text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            {row.status === "live" ? "Live" : "Idle"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[28rem] text-xs text-muted-foreground" title={row.currentTask ?? undefined}>
                          {row.currentTask ?? "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-xs",
                            row.progressTone === "upToDate" && "font-medium text-emerald-600 dark:text-emerald-300",
                            row.progressTone === "pending" && "text-muted-foreground",
                            row.progressTone === "muted" && "text-muted-foreground",
                          )}
                        >
                          {row.progressLabel}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {!shouldUseFallbackOverview ? (
              <div className="flex justify-end pt-1">
                <PaginationControls
                  total={sessionsQuery.data?.total ?? 0}
                  limit={limit}
                  offset={offset}
                  hasMore={hasMore}
                  onLimitChange={(nextLimit) => {
                    setLimit(nextLimit);
                    setOffset(0);
                  }}
                  onOffsetChange={setOffset}
                />
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
