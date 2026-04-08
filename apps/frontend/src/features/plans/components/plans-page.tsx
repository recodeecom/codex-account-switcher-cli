import { useEffect, useMemo, useState } from "react";

import { AlertMessage } from "@/components/alert-message";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOpenSpecPlans } from "@/features/plans/hooks/use-open-spec-plans";
import { getErrorMessageOrNull } from "@/utils/errors";
import { formatTimeLong } from "@/utils/formatters";
import { cn } from "@/lib/utils";

function roleCompletionLabel(done: number, total: number): string {
  return `${done}/${total}`;
}

export function PlansPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const { plansQuery, planDetailQuery } = useOpenSpecPlans(selectedSlug);

  const entries = plansQuery.data?.entries ?? [];
  const listError = getErrorMessageOrNull(plansQuery.error);
  const detailError = getErrorMessageOrNull(planDetailQuery.error);

  useEffect(() => {
    if (entries.length === 0) {
      if (selectedSlug !== null) {
        setSelectedSlug(null);
      }
      return;
    }

    if (!selectedSlug || !entries.some((entry) => entry.slug === selectedSlug)) {
      setSelectedSlug(entries[0].slug);
    }
  }, [entries, selectedSlug]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.slug === selectedSlug) ?? null,
    [entries, selectedSlug],
  );

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Visualize OpenSpec plan workspaces from <code>openspec/plan</code>.
        </p>
      </div>

      {listError ? (
        <AlertMessage
          title="Couldn’t load plans"
          description={listError}
          variant="error"
        />
      ) : null}

      {plansQuery.isLoading ? (
        <SpinnerBlock message="Loading plans…" />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No plans found"
          description="Create a plan workspace under openspec/plan to visualize it here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <div className="rounded-xl border border-border/60 bg-card/60 p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.slug}
                    data-testid={`plan-row-${entry.slug}`}
                    className={cn(
                      "cursor-pointer",
                      entry.slug === selectedSlug ? "bg-muted/50" : undefined,
                    )}
                    onClick={() => setSelectedSlug(entry.slug)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">{entry.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatTimeLong(entry.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            {selectedEntry ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{selectedEntry.title}</h2>
                  <Badge variant="outline" className="capitalize">
                    {selectedEntry.status}
                  </Badge>
                </div>

                {detailError ? (
                  <AlertMessage
                    title="Couldn’t load plan details"
                    description={detailError}
                    variant="error"
                  />
                ) : planDetailQuery.isLoading ? (
                  <SpinnerBlock message="Loading plan details…" />
                ) : planDetailQuery.data ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Role checkpoints</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {planDetailQuery.data.roles.map((role) => (
                          <div
                            key={role.role}
                            className="rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">{role.role}</span>
                              <span className="text-xs text-muted-foreground">
                                {roleCompletionLabel(role.doneCheckpoints, role.totalCheckpoints)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                      <pre className="max-h-56 overflow-auto rounded-lg border border-border/60 bg-background/30 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                        {planDetailQuery.data.summaryMarkdown}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Checkpoints log</p>
                      <pre className="max-h-56 overflow-auto rounded-lg border border-border/60 bg-background/30 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                        {planDetailQuery.data.checkpointsMarkdown}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
