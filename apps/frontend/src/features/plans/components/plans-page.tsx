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
import { cn } from "@/lib/utils";
import { getErrorMessageOrNull } from "@/utils/errors";
import { formatTimeLong } from "@/utils/formatters";

function roleCompletionLabel(done: number, total: number): string {
  return `${done}/${total}`;
}

function isFinishedProgress(progress: { doneCheckpoints: number; totalCheckpoints: number }): boolean {
  return progress.totalCheckpoints > 0 && progress.doneCheckpoints >= progress.totalCheckpoints;
}

function getDisplayStatus(
  status: string,
  progress: { doneCheckpoints: number; totalCheckpoints: number },
): string {
  if (isFinishedProgress(progress)) {
    return "Finished";
  }
  return status;
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

  return "border-slate-500/30 bg-slate-500/15 text-slate-300";
}

function formatRoleLabel(role: string): string {
  return role
    .split(/[_-]/g)
    .map((segment) => (segment ? `${segment[0].toUpperCase()}${segment.slice(1)}` : ""))
    .join(" ");
}

function formatCheckpointState(state: string): string {
  return state.toLowerCase().replace(/_/g, " ");
}

function formatCheckpointTimestamp(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return timestamp;
  }

  const formatted = formatTimeLong(new Date(parsed).toISOString());
  return `${formatted.date} ${formatted.time}`;
}

export function PlansPage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const { plansQuery, planDetailQuery, effectiveSelectedSlug } = useOpenSpecPlans(selectedSlug);

  const entries = plansQuery.data?.entries ?? [];
  const listError = getErrorMessageOrNull(plansQuery.error);
  const detailError = getErrorMessageOrNull(planDetailQuery.error);
  const planDetail = planDetailQuery.data;

  const selectedEntry = entries.find((entry) => entry.slug === effectiveSelectedSlug) ?? null;
  const sortedEntries = [...entries].sort((left, right) => {
    const leftFinished = isFinishedProgress(left.overallProgress);
    const rightFinished = isFinishedProgress(right.overallProgress);

    if (leftFinished === rightFinished) {
      return 0;
    }

    return leftFinished ? 1 : -1;
  });

  const selectedEntryDisplayStatus = selectedEntry
    ? getDisplayStatus(selectedEntry.status, selectedEntry.overallProgress)
    : null;

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
                  const isFinished = isFinishedProgress(entry.overallProgress);
                  const displayStatus = getDisplayStatus(entry.status, entry.overallProgress);
                  const progressLabel =
                    entry.overallProgress.totalCheckpoints > 0
                      ? `${roleCompletionLabel(entry.overallProgress.doneCheckpoints, entry.overallProgress.totalCheckpoints)} checkpoints • ${entry.overallProgress.percentComplete}%`
                      : "No checkpoints yet";

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
                            <Progress value={entry.overallProgress.percentComplete} className="h-1.5" />
                            <p className="text-[11px] text-muted-foreground">{progressLabel}</p>
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
                ) : planDetail ? (
                  <div className="space-y-4">
                    <div className="space-y-2 rounded-lg border border-border/60 bg-background/30 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall progress</p>
                        <p className="text-xs font-medium text-muted-foreground" data-testid="plan-progress-percent">
                          {planDetail.overallProgress.percentComplete}%
                        </p>
                      </div>
                      <Progress
                        value={planDetail.overallProgress.percentComplete}
                        className="h-2"
                        data-testid="plan-progress-bar"
                      />
                      <p className="text-xs text-muted-foreground">
                        {roleCompletionLabel(
                          planDetail.overallProgress.doneCheckpoints,
                          planDetail.overallProgress.totalCheckpoints,
                        )}{" "}
                        checkpoints complete
                      </p>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border/60 bg-background/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Where plan left off</p>
                      {planDetail.currentCheckpoint ? (
                        <div className="space-y-2" data-testid="plan-current-checkpoint">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {formatRoleLabel(planDetail.currentCheckpoint.role)} ·{" "}
                              {planDetail.currentCheckpoint.checkpointId}
                            </p>
                            <Badge variant="outline" className="capitalize">
                              {formatCheckpointState(planDetail.currentCheckpoint.state)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {planDetail.currentCheckpoint.message || "No checkpoint message provided."}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCheckpointTimestamp(planDetail.currentCheckpoint.timestamp)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No checkpoint activity recorded yet.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Role checkpoints</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {planDetail.roles.map((role) => (
                          <div
                            key={role.role}
                            className="rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{formatRoleLabel(role.role)}</span>
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
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/30 p-3 text-xs leading-relaxed">
                        {planDetail.summaryMarkdown}
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Checkpoints log</p>
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/30 p-3 text-xs leading-relaxed">
                        {planDetail.checkpointsMarkdown}
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
