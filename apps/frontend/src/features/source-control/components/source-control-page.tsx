import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, GitBranch, GitPullRequest, RefreshCw } from "lucide-react";

import { AlertMessage } from "@/components/alert-message";
import { Button } from "@/components/ui/button";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  createSourceControlPullRequest,
  mergeSourceControlPullRequest,
} from "@/features/source-control/api";
import { useProjects } from "@/features/projects/hooks/use-projects";
import {
  useSourceControl,
  useSourceControlBranchDetails,
} from "@/features/source-control/hooks/use-source-control";
import type { SourceControlMergeState } from "@/features/source-control/schemas";
import { useWorkspaces } from "@/features/workspaces/hooks/use-workspaces";
import { cn } from "@/lib/utils";
import { getErrorMessageOrNull } from "@/utils/errors";

function formatIso(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }
  return parsed.toLocaleString();
}

function mergeBadgeClass(mergeState: SourceControlMergeState): string {
  switch (mergeState) {
    case "merged":
      return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200";
    case "ready":
      return "border-cyan-400/35 bg-cyan-500/15 text-cyan-200";
    case "behind":
      return "border-amber-400/35 bg-amber-500/15 text-amber-200";
    case "diverged":
      return "border-rose-400/35 bg-rose-500/15 text-rose-200";
    default:
      return "border-white/20 bg-white/10 text-zinc-300";
  }
}

function toMergeStateLabel(mergeState: SourceControlMergeState): string {
  switch (mergeState) {
    case "merged":
      return "Merged";
    case "ready":
      return "Ready";
    case "behind":
      return "Behind";
    case "diverged":
      return "Diverged";
    default:
      return "Unknown";
  }
}

function botActivityClass(status: "idle" | "active"): string {
  return status === "active"
    ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-200"
    : "border-white/20 bg-white/10 text-zinc-300";
}

export function SourceControlPage() {
  const queryClient = useQueryClient();
  const { workspacesQuery } = useWorkspaces();
  const activeWorkspaceId = useMemo(() => {
    const entries = workspacesQuery.data?.entries ?? [];
    return entries.find((entry) => entry.isActive)?.id ?? entries[0]?.id ?? null;
  }, [workspacesQuery.data?.entries]);
  const { projectsQuery } = useProjects(activeWorkspaceId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const projects = useMemo(() => projectsQuery.data?.entries ?? [], [projectsQuery.data?.entries]);
  const effectiveProjectId = useMemo(() => {
    if (!selectedProjectId) {
      return "";
    }
    return projects.some((project) => project.id === selectedProjectId) ? selectedProjectId : "";
  }, [projects, selectedProjectId]);

  const sourceControlQuery = useSourceControl(effectiveProjectId || null);
  const preview = sourceControlQuery.data;

  useEffect(() => {
    if (!preview) {
      return;
    }
    if (selectedBranch && preview.branches.some((branch) => branch.name === selectedBranch)) {
      return;
    }
    const active = preview.branches.find((branch) => branch.isActive)?.name;
    const fallback = preview.branches[0]?.name;
    if (active || fallback) {
      setSelectedBranch(active ?? fallback ?? "");
    }
  }, [preview, selectedBranch]);

  const branchDetailsQuery = useSourceControlBranchDetails(
    effectiveProjectId || null,
    selectedBranch || null,
  );
  const details = branchDetailsQuery.data;

  const createPrMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranch || !preview) {
        throw new Error("Select a branch first.");
      }
      return createSourceControlPullRequest({
        projectId: effectiveProjectId || null,
        branch: selectedBranch,
        baseBranch: preview.baseBranch,
      });
    },
    onSuccess: async (result) => {
      setActionMessage(result.message);
      await queryClient.invalidateQueries({ queryKey: ["source-control"] });
    },
  });

  const mergePrMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBranch || !details?.pullRequest) {
        throw new Error("No open pull request for this branch.");
      }
      return mergeSourceControlPullRequest({
        projectId: effectiveProjectId || null,
        branch: selectedBranch,
        pullRequestNumber: details.pullRequest.number,
        baseBranch: details.baseBranch,
        deleteBranch: true,
      });
    },
    onSuccess: async (result) => {
      setActionMessage(result.message);
      await queryClient.invalidateQueries({ queryKey: ["source-control"] });
    },
  });

  const error = getErrorMessageOrNull(sourceControlQuery.error);
  const actionError =
    getErrorMessageOrNull(createPrMutation.error) ?? getErrorMessageOrNull(mergePrMutation.error);

  const loading = sourceControlQuery.isLoading && !preview;
  if (loading) {
    return (
      <div className="py-12">
        <SpinnerBlock />
      </div>
    );
  }

  return (
    <div className="h-full w-full space-y-3 p-2 sm:p-3">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#060c18]/90 px-3 py-2.5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Source Control</h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Runtime-layout view for branches, current changes, PR status, and GX bot sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="source-control-project-select">
            Project
          </label>
          <select
            id="source-control-project-select"
            value={effectiveProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="h-8 min-w-[260px] rounded-lg border border-white/15 bg-[#0b1222] px-3 text-xs text-zinc-100 outline-none transition-colors focus:border-cyan-300/45"
          >
            <option value="">Current repository</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setActionMessage(null);
              void queryClient.invalidateQueries({ queryKey: ["source-control"] });
            }}
            disabled={sourceControlQuery.isFetching || branchDetailsQuery.isFetching}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", sourceControlQuery.isFetching ? "animate-spin" : "")} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? <AlertMessage variant="error">{error}</AlertMessage> : null}
      {actionError ? <AlertMessage variant="error">{actionError}</AlertMessage> : null}
      {actionMessage ? <AlertMessage variant="success">{actionMessage}</AlertMessage> : null}

      {preview ? (
        <div className="grid min-h-[calc(100vh-220px)] gap-3 xl:grid-cols-[330px_1fr]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-white/[0.08] bg-[#060c18]/95 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-300">
              Current codex branches
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              local: {preview.activeBranch} • main: {preview.baseBranch}
            </p>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {preview.branches.map((branch) => (
                <button
                  type="button"
                  key={branch.name}
                  onClick={() => {
                    setActionMessage(null);
                    setSelectedBranch(branch.name);
                  }}
                  className={cn(
                    "w-full cursor-pointer rounded-md border px-2.5 py-2 text-left transition-colors",
                    selectedBranch === branch.name
                      ? "border-cyan-400/40 bg-cyan-500/15"
                      : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-black/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-zinc-100">{branch.name}</p>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                        mergeBadgeClass(branch.mergeState),
                      )}
                    >
                      {toMergeStateLabel(branch.mergeState)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">ahead {branch.ahead} • behind {branch.behind}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-3">
            {branchDetailsQuery.isLoading && !details ? (
              <div className="py-12">
                <SpinnerBlock />
              </div>
            ) : details ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-lg border border-white/[0.08] bg-[#060f1d] p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Current branch</p>
                    <p className="mt-2 truncate text-sm font-semibold text-zinc-100">{details.branch}</p>
                  </article>
                  <article className="rounded-lg border border-white/[0.08] bg-[#060f1d] p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Main/base branch</p>
                    <p className="mt-2 truncate text-sm font-semibold text-zinc-100">{details.baseBranch}</p>
                  </article>
                  <article className="rounded-lg border border-white/[0.08] bg-[#060f1d] p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Linked GX bots</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-100">{details.linkedBots.length}</p>
                  </article>
                  <article className="rounded-lg border border-white/[0.08] bg-[#060f1d] p-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Merge status</p>
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                        mergeBadgeClass(details.mergeState),
                      )}
                    >
                      {toMergeStateLabel(details.mergeState)}
                    </span>
                  </article>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <article className="rounded-xl border border-white/[0.08] bg-[#060c18]/95 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">
                      <GitPullRequest className="h-3.5 w-3.5 text-cyan-300" />
                      Pull request status
                    </div>
                    {details.pullRequest ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-zinc-100">
                          #{details.pullRequest.number} {details.pullRequest.title}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {details.pullRequest.headBranch} {"->"} {details.pullRequest.baseBranch}
                          {details.pullRequest.author ? ` • ${details.pullRequest.author}` : ""}
                        </p>
                        {details.pullRequest.url ? (
                          <a
                            href={details.pullRequest.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-[11px] text-cyan-300 underline decoration-cyan-400/50 underline-offset-2 hover:text-cyan-200"
                          >
                            Open PR
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">No open pull request for this branch.</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setActionMessage(null);
                          createPrMutation.mutate();
                        }}
                        disabled={
                          createPrMutation.isPending
                          || mergePrMutation.isPending
                          || details.branch === details.baseBranch
                          || Boolean(details.pullRequest)
                        }
                      >
                        {createPrMutation.isPending ? "Creating..." : "Create PR (gh)"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setActionMessage(null);
                          mergePrMutation.mutate();
                        }}
                        disabled={
                          mergePrMutation.isPending
                          || createPrMutation.isPending
                          || !details.pullRequest
                        }
                      >
                        {mergePrMutation.isPending ? "Merging..." : "Merge PR (gh)"}
                      </Button>
                    </div>
                  </article>

                  <article className="rounded-xl border border-white/[0.08] bg-[#060c18]/95 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">
                      <Bot className="h-3.5 w-3.5 text-cyan-300" />
                      Current GX bot statuses
                    </div>
                    <div className="space-y-2">
                      {preview.gxBots.length === 0 ? (
                        <p className="text-xs text-zinc-500">No bots configured.</p>
                      ) : (
                        preview.gxBots.map((bot) => (
                          <div
                            key={`${bot.botName}-${bot.runtime}`}
                            className={cn(
                              "rounded-md border px-2.5 py-2",
                              bot.matchedBranch === details.branch
                                ? "border-cyan-400/30 bg-cyan-500/10"
                                : "border-white/8 bg-black/20",
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-zinc-100">{bot.botName}</p>
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                                  botActivityClass(bot.botStatus),
                                )}
                              >
                                {bot.botStatus}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-400">
                              matched branch: {bot.matchedBranch ?? "--"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                </div>

                <article className="rounded-xl border border-cyan-500/25 bg-[#061220]/90 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">
                    <GitBranch className="h-3.5 w-3.5 text-cyan-300" />
                    Current changes ({details.branch})
                  </div>
                  <div className="space-y-1.5">
                    {details.changedFiles.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        No file diffs against {details.baseBranch} for this branch.
                      </p>
                    ) : (
                      details.changedFiles.map((file) => (
                        <div
                          key={`${details.branch}:${file.path}:${file.code}`}
                          className="flex items-start gap-2 rounded-md border border-white/10 bg-[#030912] px-2.5 py-1.5"
                        >
                          <span className="mt-0.5 w-4 text-[10px] font-semibold text-emerald-300">{file.code}</span>
                          <span className="min-w-0 break-all text-[11px] text-zinc-300">{file.path}</span>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Select a branch to view changes and PR status.</p>
            )}
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="text-[11px] text-zinc-500">
          refreshed {formatIso(preview.refreshedAt)}
        </div>
      ) : null}
    </div>
  );
}
