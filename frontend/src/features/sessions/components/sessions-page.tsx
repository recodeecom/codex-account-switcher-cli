import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
import { listStickySessions } from "@/features/sticky-sessions/api";
import { Badge } from "@/components/ui/badge";
import { usePrivacyStore } from "@/hooks/use-privacy";
import { formatTimeLong } from "@/utils/formatters";

const DEFAULT_LIMIT = 25;

type AccountSessionGroup = {
  accountId: string;
  displayName: string;
  entries: Array<{
    key: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export function SessionsPage() {
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const blurred = usePrivacyStore((s) => s.blurred);

  const sessionsQuery = useQuery({
    queryKey: ["sticky-sessions", "codex-sessions", { offset, limit }],
    queryFn: () =>
      listStickySessions({
        kind: "codex_session",
        staleOnly: false,
        offset,
        limit,
      }),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const entries = sessionsQuery.data?.entries;
  const total = sessionsQuery.data?.total ?? 0;
  const hasMore = sessionsQuery.data?.hasMore ?? false;

  const groups = useMemo<AccountSessionGroup[]>(() => {
    const grouped = new Map<string, AccountSessionGroup>();
    for (const entry of entries ?? []) {
      const existing = grouped.get(entry.accountId);
      if (existing) {
        existing.entries.push({
          key: entry.key,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        });
        continue;
      }

      grouped.set(entry.accountId, {
        accountId: entry.accountId,
        displayName: entry.displayName,
        entries: [
          {
            key: entry.key,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          },
        ],
      });
    }
    return Array.from(grouped.values());
  }, [entries]);

  const accountCount = groups.length;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only Codex sessions grouped by account.
        </p>
      </div>

      {sessionsQuery.isLoading && !sessionsQuery.data ? (
        <div className="py-8">
          <SpinnerBlock />
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={Pin}
          title="No Codex sessions"
          description="Codex sessions will appear here once routed requests create sticky session mappings."
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
            {groups.map((group) => (
              <div key={group.accountId} className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {blurred ? <span className="privacy-blur">{group.displayName}</span> : group.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">Account ID: {group.accountId}</p>
                  </div>
                  <Badge variant="outline" className="tabular-nums">
                    {group.entries.length}
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Session key</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Updated</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/80">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.entries.map((entry) => {
                        const updated = formatTimeLong(entry.updatedAt);
                        const created = formatTimeLong(entry.createdAt);

                        return (
                          <TableRow key={entry.key}>
                            <TableCell className="max-w-[26rem] truncate font-mono text-xs" title={entry.key}>
                              {entry.key}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {updated.date} {updated.time}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {created.date} {created.time}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-1">
              <PaginationControls
                total={total}
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
          </section>
        </>
      )}
    </div>
  );
}
