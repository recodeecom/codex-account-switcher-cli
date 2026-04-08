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

function normalizeMarkdownLine(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function parseSummaryLines(summaryMarkdown: string): string[] {
  const normalizedMarkdown = summaryMarkdown.replace(/\\n/g, "\n");

  return normalizedMarkdown
    .split("\n")
    .map((line) => normalizeMarkdownLine(line))
    .filter((line) => line.length > 0);
}

type ParsedCheckpointEntry = {
  timestamp: string;
  role: string | null;
  checkpointId: string | null;
  state: string | null;
  message: string | null;
};

type ParsedCheckpointLine =
  | { type: "entry"; entry: ParsedCheckpointEntry }
  | { type: "text"; text: string };

function parseCheckpointEntry(line: string): ParsedCheckpointEntry | null {
  const normalized = normalizeMarkdownLine(line);
  if (!normalized || /^no checkpoints recorded yet\.?$/i.test(normalized)) {
    return null;
  }

  const segments = normalized.split("|").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [timestamp, ...rest] = segments;
  let role: string | null = null;
  let checkpointId: string | null = null;
  let state: string | null = null;
  const messageSegments: string[] = [];

  for (const segment of rest) {
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex < 0) {
      messageSegments.push(segment);
      continue;
    }

    const key = segment.slice(0, separatorIndex).trim().toLowerCase();
    const value = segment.slice(separatorIndex + 1).trim();
    if (!value) {
      continue;
    }

    if (key === "role") {
      role = value;
      continue;
    }
    if (key === "id" || key === "checkpoint") {
      checkpointId = value;
      continue;
    }
    if (key === "state") {
      state = value;
      continue;
    }

    messageSegments.push(`${key}: ${value}`);
  }

  return {
    timestamp,
    role,
    checkpointId,
    state,
    message: messageSegments.length > 0 ? messageSegments.join(" • ") : null,
  };
}

function parseCheckpointLines(checkpointsMarkdown: string): ParsedCheckpointLine[] {
  const normalizedMarkdown = checkpointsMarkdown.replace(/\\n/g, "\n");
  const lines = normalizedMarkdown
    .split("\n")
    .map((line) => normalizeMarkdownLine(line))
    .filter((line) => line.length > 0 && !/^plan checkpoints:/i.test(line));

  if (lines.length === 0) {
    return [];
  }

  return lines.map((line) => {
    if (/^no checkpoints recorded yet\.?$/i.test(line)) {
      return { type: "text", text: "No checkpoints recorded yet." } as const;
    }

    const parsedEntry = parseCheckpointEntry(line);
    if (!parsedEntry) {
      return { type: "text", text: line } as const;
    }

    return { type: "entry", entry: parsedEntry } as const;
  });
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
  const summaryLines = planDetail ? parseSummaryLines(planDetail.summaryMarkdown) : [];
  const checkpointLines = planDetail ? parseCheckpointLines(planDetail.checkpointsMarkdown) : [];

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
                      <div
                        className="max-h-56 space-y-2 overflow-auto rounded-lg border border-border/60 bg-background/30 p-3"
                        data-testid="plan-summary-content"
                      >
                        {summaryLines.length > 0 ? (
                          summaryLines.map((line, index) => {
                            const keyValueMatch = line.match(/^([^:]{1,40}):\s*(.+)$/);
                            if (!keyValueMatch) {
                              return (
                                <p key={`${index}-${line}`} className="text-xs leading-relaxed text-foreground/90">
                                  {line}
                                </p>
                              );
                            }

                            return (
                              <div
                                key={`${index}-${line}`}
                                className="rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5"
                              >
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  {keyValueMatch[1]}
                                </p>
                                <p className="text-xs leading-relaxed text-foreground">{keyValueMatch[2]}</p>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground">No summary details available.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Checkpoints log</p>
                      <div
                        className="max-h-56 space-y-2 overflow-auto rounded-lg border border-border/60 bg-background/30 p-3"
                        data-testid="plan-checkpoints-content"
                      >
                        {checkpointLines.length > 0 ? (
                          checkpointLines.map((line, index) => {
                            if (line.type === "text") {
                              return (
                                <p key={`${index}-${line.text}`} className="text-xs leading-relaxed text-muted-foreground">
                                  {line.text}
                                </p>
                              );
                            }

                            return (
                              <div
                                key={`${line.entry.timestamp}-${index}`}
                                className="rounded-md border border-border/50 bg-background/50 p-2.5"
                                data-testid={`plan-checkpoint-entry-${index}`}
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="text-[11px] font-medium text-muted-foreground">
                                    {formatCheckpointTimestamp(line.entry.timestamp)}
                                  </p>
                                  {line.entry.role ? (
                                    <Badge variant="outline" className="text-[10px]">
                                      {formatRoleLabel(line.entry.role)}
                                    </Badge>
                                  ) : null}
                                  {line.entry.checkpointId ? (
                                    <Badge variant="outline" className="text-[10px]">
                                      {line.entry.checkpointId}
                                    </Badge>
                                  ) : null}
                                  {line.entry.state ? (
                                    <Badge variant="outline" className="text-[10px] capitalize">
                                      {formatCheckpointState(line.entry.state)}
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                                  {line.entry.message ?? "Checkpoint event recorded."}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground">No checkpoint log entries yet.</p>
                        )}
                      </div>
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
