import { useState } from "react";
import { FolderTree } from "lucide-react";

import { AlertMessage } from "@/components/alert-message";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

function planProgress(roles: { doneCheckpoints: number; totalCheckpoints: number }[]): {
  done: number;
  total: number;
  percent: number;
} {
  const done = roles.reduce((acc, role) => acc + role.doneCheckpoints, 0);
  const total = roles.reduce((acc, role) => acc + role.totalCheckpoints, 0);

  if (total <= 0) {
    return { done, total, percent: 0 };
  }

  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
  };
}

function isFinishedProgress(progress: { done: number; total: number }): boolean {
  return progress.total > 0 && progress.done >= progress.total;
}

function statusBadgeClass(status: string): string {
  const normalizedStatus = status.trim().toLowerCase();

  if (normalizedStatus === "finished") {
    return "border-emerald-500/40 bg-emerald-500/20 text-emerald-200";
  }

  if (normalizedStatus === "approved") {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  }

  if (normalizedStatus === "draft") {
    return "border-border/70 bg-secondary/60 text-secondary-foreground";
  }

  if (normalizedStatus === "unknown") {
    return "border-red-500/30 bg-red-500/15 text-red-300";
  }

  if (normalizedStatus.startsWith("proposed")) {
    return "border-amber-500/30 bg-amber-500/15 text-amber-300";
  }

  return "border-slate-500/30 bg-slate-500/15 text-slate-300";
}

export function PlansPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const { plansQuery, planDetailQuery, effectiveSelectedSlug } = useOpenSpecPlans(selectedSlug);

  const entries = plansQuery.data?.entries ?? [];
  const listError = getErrorMessageOrNull(plansQuery.error);
  const detailError = getErrorMessageOrNull(planDetailQuery.error);

  const selectedEntry = entries.find((entry) => entry.slug === effectiveSelectedSlug) ?? null;
  const sortedEntries = [...entries].sort((left, right) => {
    const leftFinished = isFinishedProgress(planProgress(left.roles));
    const rightFinished = isFinishedProgress(planProgress(right.roles));

    if (leftFinished === rightFinished) {
      return 0;
    }

    return leftFinished ? 1 : -1;
  });

  const selectedEntryProgress = selectedEntry ? planProgress(selectedEntry.roles) : null;
  const selectedEntryDisplayStatus =
    selectedEntry && selectedEntryProgress && isFinishedProgress(selectedEntryProgress)
      ? "Finished"
      : selectedEntry?.status ?? null;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Visualize OpenSpec plan workspaces from <code>openspec/plan</code>.
        </p>
      </div>

      {listError ? (
        <AlertMessage variant="error">Couldn’t load plans: {listError}</AlertMessage>
      ) : null}

      {plansQuery.isLoading ? (
        <SpinnerBlock label="Loading plans…" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No plans found"
          description="Create a plan workspace under openspec/plan to visualize it here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(30rem,36rem)_minmax(0,1fr)]">
          <div className="rounded-xl border border-border/60 bg-card/60 p-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[56%]">Plan</TableHead>
                  <TableHead className="w-[18%]">Status</TableHead>
                  <TableHead className="w-[26%] text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry) => {
                  const updatedAt = formatTimeLong(entry.updatedAt);
                  const progress = planProgress(entry.roles);
                  const isFinished = isFinishedProgress(progress);
                  const displayStatus = isFinished ? "Finished" : entry.status;

                  return (
                    <TableRow
                      key={entry.slug}
                      data-testid={`plan-row-${entry.slug}`}
                    className={cn(
                        isFinished ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                        entry.slug === effectiveSelectedSlug ? "bg-muted/50" : undefined,
                      )}
                      onClick={() => {
                        if (isFinished) {
                          return;
                        }
                        setSelectedSlug(entry.slug);
                      }}
                    >
                      <TableCell className="align-top">
                        <div className="space-y-1.5">
                          <p className="truncate font-medium">{entry.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{entry.slug}</p>
                          <div className="space-y-1">
                            <Progress value={progress.percent} className="h-1.5 bg-muted/70" />
                            <p className="text-[11px] text-muted-foreground">
                              {progress.total > 0
                                ? `${roleCompletionLabel(progress.done, progress.total)} checkpoints • ${progress.percent}%`
                                : "No checkpoints yet"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={cn("capitalize", statusBadgeClass(displayStatus))}>
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top text-right text-xs text-muted-foreground">
                        <div className="space-y-0.5 whitespace-nowrap">
                          <p>{updatedAt.date}</p>
                          <p>{updatedAt.time}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            {selectedEntry ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{selectedEntry.title}</h2>
                  <Badge
                    variant="outline"
                    className={cn("capitalize", statusBadgeClass(selectedEntryDisplayStatus ?? selectedEntry.status))}
                  >
                    {selectedEntryDisplayStatus ?? selectedEntry.status}
                  </Badge>
                </div>

                {detailError ? (
                  <AlertMessage variant="error">
                    Couldn’t load plan details: {detailError}
                  </AlertMessage>
                ) : planDetailQuery.isLoading ? (
                  <SpinnerBlock label="Loading plan details…" />
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
