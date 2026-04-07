import { useEffect, useMemo, useState } from "react";
import { FolderKanban, SendHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { AlertMessage } from "@/components/alert-message";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getDashboardOverview } from "@/features/dashboard/api";
import type { AccountSummary } from "@/features/dashboard/schemas";
import { useProjects } from "@/features/projects/hooks/use-projects";
import type { ProjectEntry, ProjectSandboxMode } from "@/features/projects/schemas";
import { sendPromptToAccountTerminal } from "@/features/sessions/terminal-dispatch";
import { useDialogState } from "@/hooks/use-dialog-state";
import { getErrorMessageOrNull } from "@/utils/errors";
import { formatTimeLong } from "@/utils/formatters";

const NO_PROJECT_CONTEXT_VALUE = "__no_project_context__";
const DEFAULT_SANDBOX_MODE: ProjectSandboxMode = "workspace-write";
const SANDBOX_MODE_OPTIONS: Array<{ value: ProjectSandboxMode; label: string }> = [
  { value: "read-only", label: "read-only" },
  { value: "workspace-write", label: "workspace-write" },
  { value: "danger-full-access", label: "danger-full-access" },
];

function buildProjectContextBlock(args: {
  name: string;
  description: string | null;
  projectPath: string | null;
  sandboxMode: string;
  gitBranch: string | null;
}): string {
  const setupLines = [
    "Required setup:",
    args.projectPath
      ? `1. Use working directory: ${args.projectPath}`
      : "1. Ask for a valid absolute project path before running the task.",
    `2. Use sandbox mode: ${args.sandboxMode}`,
    args.gitBranch
      ? `3. Switch to git branch: ${args.gitBranch} (create if missing)`
      : "3. Use the current branch or create a dedicated task branch.",
    "",
  ];
  return [
    "Project context:",
    `- Name: ${args.name}`,
    `- Description: ${args.description ?? "none"}`,
    `- Path: ${args.projectPath ?? "not configured"}`,
    `- Sandbox mode: ${args.sandboxMode}`,
    `- Git branch: ${args.gitBranch ?? "not configured"}`,
    "",
    ...setupLines,
    "Task:",
  ].join("\n");
}

function formatAccountLabel(account: AccountSummary): string {
  const displayName = account.displayName.trim();
  const email = account.email.trim();
  if (!displayName) {
    return email;
  }
  if (!email || displayName.toLowerCase() === email.toLowerCase()) {
    return displayName;
  }
  return `${displayName} (${email})`;
}

export function ProjectsPage() {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [projectSandboxMode, setProjectSandboxMode] = useState<ProjectSandboxMode>(DEFAULT_SANDBOX_MODE);
  const [projectGitBranch, setProjectGitBranch] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [editingProjectDescription, setEditingProjectDescription] = useState("");
  const [editingProjectPath, setEditingProjectPath] = useState("");
  const [editingProjectSandboxMode, setEditingProjectSandboxMode] =
    useState<ProjectSandboxMode>(DEFAULT_SANDBOX_MODE);
  const [editingProjectGitBranch, setEditingProjectGitBranch] = useState("");
  const [controlAccountId, setControlAccountId] = useState("");
  const [controlProjectId, setControlProjectId] = useState(NO_PROJECT_CONTEXT_VALUE);
  const [manualAccountId, setManualAccountId] = useState("");
  const [controlPrompt, setControlPrompt] = useState("");
  const [controlSending, setControlSending] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);
  const { projectsQuery, createMutation, updateMutation, deleteMutation } = useProjects();
  const deleteDialog = useDialogState<{ id: string; name: string }>();
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
    enabled: showControlCenter,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const mutationError = useMemo(
    () =>
      getErrorMessageOrNull(projectsQuery.error) ||
      getErrorMessageOrNull(createMutation.error) ||
      getErrorMessageOrNull(updateMutation.error) ||
      getErrorMessageOrNull(deleteMutation.error),
    [
      projectsQuery.error,
      createMutation.error,
      updateMutation.error,
      deleteMutation.error,
    ],
  );
  const displayMutationError = useMemo(() => {
    if (!mutationError) {
      return null;
    }
    if (
      mutationError.toLowerCase() === "unexpected error"
      && projectsQuery.isError
    ) {
      return "Couldn’t load projects yet. Check backend status and database migrations, then refresh.";
    }
    return mutationError;
  }, [mutationError, projectsQuery.isError]);
  const controlPanelError = getErrorMessageOrNull(overviewQuery.error);

  const entries = projectsQuery.data?.entries ?? [];
  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const addDisabled = busy || editingProjectId !== null;
  const orderedAccounts = useMemo<AccountSummary[]>(
    () =>
      [...(overviewQuery.data?.accounts ?? [])].sort((left, right) =>
        left.displayName.localeCompare(right.displayName, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      ),
    [overviewQuery.data?.accounts],
  );
  const selectedProject =
    controlProjectId !== NO_PROJECT_CONTEXT_VALUE
      ? entries.find((entry) => entry.id === controlProjectId) ?? null
      : null;
  const selectedAccount = orderedAccounts.find((account) => account.accountId === controlAccountId) ?? null;
  const effectiveControlAccountId = controlAccountId.trim() || manualAccountId.trim();
  const controlDisabled = controlSending || !effectiveControlAccountId || controlPrompt.trim().length === 0;

  useEffect(() => {
    if (controlAccountId || orderedAccounts.length === 0) {
      return;
    }
    const firstLiveAccount =
      orderedAccounts.find((account) => (account.codexLiveSessionCount ?? 0) > 0) ?? null;
    setControlAccountId(firstLiveAccount?.accountId ?? orderedAccounts[0].accountId);
  }, [controlAccountId, orderedAccounts]);

  const handleAdd = async () => {
    const name = projectName.trim();
    if (!name) {
      return;
    }

    await createMutation.mutateAsync({
      name,
      description: projectDescription.trim() || null,
      projectPath: projectPath.trim() || null,
      sandboxMode: projectSandboxMode,
      gitBranch: projectGitBranch.trim() || null,
    });

    setProjectName("");
    setProjectDescription("");
    setProjectPath("");
    setProjectSandboxMode(DEFAULT_SANDBOX_MODE);
    setProjectGitBranch("");
  };

  const handleEditStart = (entry: ProjectEntry) => {
    setEditingProjectId(entry.id);
    setEditingProjectName(entry.name);
    setEditingProjectDescription(entry.description ?? "");
    setEditingProjectPath(entry.projectPath ?? "");
    setEditingProjectSandboxMode(entry.sandboxMode);
    setEditingProjectGitBranch(entry.gitBranch ?? "");
  };

  const handleEditCancel = () => {
    setEditingProjectId(null);
    setEditingProjectName("");
    setEditingProjectDescription("");
    setEditingProjectPath("");
    setEditingProjectSandboxMode(DEFAULT_SANDBOX_MODE);
    setEditingProjectGitBranch("");
  };

  const handleEditSave = async () => {
    if (!editingProjectId) {
      return;
    }
    const name = editingProjectName.trim();
    if (!name) {
      return;
    }
    await updateMutation.mutateAsync({
      projectId: editingProjectId,
      payload: {
        name,
        description: editingProjectDescription.trim() || null,
        projectPath: editingProjectPath.trim() || null,
        sandboxMode: editingProjectSandboxMode,
        gitBranch: editingProjectGitBranch.trim() || null,
      },
    });
    handleEditCancel();
  };

  const injectProjectContext = () => {
    if (!selectedProject) {
      return;
    }
    const contextBlock = buildProjectContextBlock({
      name: selectedProject.name,
      description: selectedProject.description,
      projectPath: selectedProject.projectPath,
      sandboxMode: selectedProject.sandboxMode,
      gitBranch: selectedProject.gitBranch,
    });
    setControlPrompt(contextBlock);
  };

  const handleSendControlPrompt = async () => {
    if (!controlAccountId) {
      toast.error("Select an account first.");
      return;
    }
    const prompt = controlPrompt.trim();
    if (!prompt) {
      toast.error("Enter a task prompt first.");
      return;
    }
    setControlSending(true);
    try {
      await sendPromptToAccountTerminal({
        accountId: effectiveControlAccountId,
        prompt,
      });
      const displayName = selectedAccount?.displayName ?? effectiveControlAccountId;
      toast.success(`Prompt sent to ${displayName}`);
    } catch (caught) {
      toast.error(getErrorMessageOrNull(caught) ?? "Failed to dispatch prompt");
    } finally {
      setControlSending(false);
    }
  };

  return (
    <div className="animate-fade-in-up space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Group and manage your project contexts in one place.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={showControlCenter ? "secondary" : "outline"}
          className="h-9 rounded-full px-4 text-xs"
          onClick={() => {
            setShowControlCenter((current) => !current);
          }}
        >
          {showControlCenter ? "Hide Codex control tools" : "Open Codex control tools"}
        </Button>
      </div>

      {displayMutationError ? (
        <AlertMessage variant="error">{displayMutationError}</AlertMessage>
      ) : null}

      {showControlCenter ? (
      <section className="relative space-y-5 overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[radial-gradient(140%_170%_at_0%_0%,rgba(56,189,248,0.16)_0%,rgba(7,12,24,0.92)_54%,rgba(3,8,18,0.98)_100%)] p-5 shadow-[0_12px_40px_-24px_rgba(56,189,248,0.45)] backdrop-blur-sm md:p-6">
        <div
          aria-hidden="true"
            className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-cyan-400/25 blur-3xl"
          />
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-400/15">
              <SendHorizontal className="h-4.5 w-4.5 text-cyan-100" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-cyan-50">Codex control center</h3>
              <p className="text-xs text-cyan-100/70">
                Dispatch prompts from the dashboard without opening CLI manually.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-full border-cyan-400/30 bg-cyan-400/10 px-4 text-xs text-cyan-50 hover:bg-cyan-400/15"
            onClick={() => {
              void overviewQuery.refetch();
            }}
            disabled={overviewQuery.isFetching}
          >
            Refresh accounts
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full border border-cyan-400/35 bg-cyan-400/15 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
            iOS-friendly quick dispatch
          </span>
          {selectedAccount ? (
            <span className="inline-flex h-6 items-center rounded-full border border-emerald-400/35 bg-emerald-400/15 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
              Active target: {selectedAccount.displayName}
            </span>
          ) : null}
        </div>

        {controlPanelError ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Couldn’t refresh account list right now ({controlPanelError}). You can still dispatch by manual account ID.
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium tracking-normal text-cyan-100/80">
              Target account
            </Label>
            <Select
              value={controlAccountId}
              onValueChange={setControlAccountId}
              disabled={orderedAccounts.length === 0 || controlSending}
            >
              <SelectTrigger className="h-10 rounded-2xl border-cyan-400/25 bg-black/20 px-3 text-xs">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {orderedAccounts.map((account) => (
                  <SelectItem key={account.accountId} value={account.accountId}>
                    {formatAccountLabel(account)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {orderedAccounts.length === 0 ? (
              <Input
                value={manualAccountId}
                onChange={(event) => setManualAccountId(event.target.value)}
                placeholder="Manual account ID (e.g. acc_primary)"
                className="h-10 rounded-2xl border-cyan-400/25 bg-black/20 text-xs"
                disabled={controlSending}
              />
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium tracking-normal text-cyan-100/80">
              Project context (optional)
            </Label>
            <Select
              value={controlProjectId}
              onValueChange={setControlProjectId}
              disabled={entries.length === 0 || controlSending}
            >
              <SelectTrigger className="h-10 rounded-2xl border-cyan-400/25 bg-black/20 px-3 text-xs">
                <SelectValue placeholder="No project context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT_CONTEXT_VALUE}>No project context</SelectItem>
                {entries.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Textarea
          value={controlPrompt}
          onChange={(event) => setControlPrompt(event.target.value)}
          placeholder="Describe exactly what this Codex account should implement next..."
          className="min-h-32 rounded-2xl border-cyan-500/25 bg-black/25 text-sm leading-6 placeholder:text-cyan-100/40"
          disabled={controlSending}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-500/20 bg-black/20 px-3 py-2">
          <p className="text-xs text-cyan-100/75">
            {selectedAccount
              ? `Selected account: ${formatAccountLabel(selectedAccount)}`
              : effectiveControlAccountId
                ? `Selected account: ${effectiveControlAccountId}`
                : "Pick a target account to enable dispatch."}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-full border-cyan-400/30 bg-transparent px-4 text-xs text-cyan-50 hover:bg-cyan-400/12"
              onClick={injectProjectContext}
              disabled={controlSending || selectedProject == null}
            >
              Insert project context
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-full bg-cyan-500 px-4 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
              onClick={() => {
                void handleSendControlPrompt();
              }}
              disabled={controlDisabled}
            >
              {controlSending ? "Sending…" : "Send to Codex"}
            </Button>
          </div>
        </div>
      </section>
      ) : null}

      <section className="space-y-4 rounded-[28px] border border-border/65 bg-card/85 p-5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)] backdrop-blur-sm md:p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <FolderKanban className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Saved projects</h3>
            <p className="text-xs text-muted-foreground">Create and maintain reusable project contexts.</p>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Project name (e.g. recodee-core)"
              className="h-10 rounded-2xl text-xs"
              disabled={addDisabled}
            />
            <Input
              value={projectPath}
              onChange={(event) => setProjectPath(event.target.value)}
              placeholder="Absolute project path (optional)"
              className="h-10 rounded-2xl text-xs"
              disabled={addDisabled}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
            <Input
              value={projectGitBranch}
              onChange={(event) => setProjectGitBranch(event.target.value)}
              placeholder="Git branch (optional)"
              className="h-10 rounded-2xl text-xs"
              disabled={addDisabled}
            />
            <Select
              value={projectSandboxMode}
              onValueChange={(value) => setProjectSandboxMode(value as ProjectSandboxMode)}
              disabled={addDisabled}
            >
              <SelectTrigger className="h-10 rounded-2xl text-xs">
                <SelectValue placeholder="Sandbox mode" />
              </SelectTrigger>
              <SelectContent>
                {SANDBOX_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              className="h-10 rounded-2xl px-4 text-xs"
              onClick={() => {
                void handleAdd();
              }}
              disabled={addDisabled || !projectName.trim()}
            >
              Add project
            </Button>
          </div>
          <Textarea
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder="Optional description (max 512 characters)"
            className="min-h-24 rounded-2xl text-xs"
            disabled={addDisabled}
            maxLength={512}
          />
        </div>

        {projectsQuery.isLoading && !projectsQuery.data ? (
          <div className="py-8">
            <SpinnerBlock />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Add a project name to get started."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Sandbox</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const isEditing = editingProjectId === entry.id;
                  const updated = formatTimeLong(entry.updatedAt);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input
                            value={editingProjectName}
                            onChange={(event) => setEditingProjectName(event.target.value)}
                            className="h-8 text-xs"
                            disabled={busy}
                            aria-label={`Edit project name for ${entry.name}`}
                          />
                        ) : (
                          entry.name
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {isEditing ? (
                          <Input
                            value={editingProjectPath}
                            onChange={(event) => setEditingProjectPath(event.target.value)}
                            className="h-8 text-xs"
                            disabled={busy}
                            aria-label={`Edit project path for ${entry.name}`}
                          />
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {entry.projectPath || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {isEditing ? (
                          <Select
                            value={editingProjectSandboxMode}
                            onValueChange={(value) =>
                              setEditingProjectSandboxMode(value as ProjectSandboxMode)
                            }
                            disabled={busy}
                          >
                            <SelectTrigger
                              className="h-8 text-xs"
                              aria-label={`Edit sandbox mode for ${entry.name}`}
                            >
                              <SelectValue placeholder="Sandbox mode" />
                            </SelectTrigger>
                            <SelectContent>
                              {SANDBOX_MODE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {entry.sandboxMode}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {isEditing ? (
                          <Input
                            value={editingProjectGitBranch}
                            onChange={(event) => setEditingProjectGitBranch(event.target.value)}
                            className="h-8 text-xs"
                            disabled={busy}
                            aria-label={`Edit git branch for ${entry.name}`}
                          />
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {entry.gitBranch || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[460px] align-top">
                        {isEditing ? (
                          <Textarea
                            value={editingProjectDescription}
                            onChange={(event) => setEditingProjectDescription(event.target.value)}
                            className="min-h-20 text-xs"
                            disabled={busy}
                            maxLength={512}
                            aria-label={`Edit project description for ${entry.name}`}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">{entry.description || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {updated.date} {updated.time}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  void handleEditSave();
                                }}
                                disabled={busy || !editingProjectName.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleEditCancel}
                                disabled={busy}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditStart(entry)}
                                disabled={busy}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteDialog.show({ id: entry.id, name: entry.name })}
                                disabled={busy}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete project?"
        description={
          deleteDialog.data
            ? `Remove ${deleteDialog.data.name}? This action cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete"
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={() => {
          if (!deleteDialog.data) {
            return;
          }
          const target = deleteDialog.data;
          void deleteMutation.mutateAsync(target.id).then(() => {
            deleteDialog.hide();
            if (editingProjectId === target.id) {
              handleEditCancel();
            }
          });
        }}
      />
    </div>
  );
}
