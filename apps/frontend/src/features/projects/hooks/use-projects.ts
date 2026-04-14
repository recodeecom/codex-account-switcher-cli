import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createProject,
  deleteProject,
  listProjects,
  listProjectPlanLinks,
  openProjectFolder,
  updateProject,
} from "@/features/projects/api";
import type { ProjectCreateRequest, ProjectUpdateRequest } from "@/features/projects/schemas";

export function useProjects(activeWorkspaceId: string | null = null) {
  const queryClient = useQueryClient();
  const queryKey = ["projects", "list", activeWorkspaceId ?? "no-workspace"] as const;

  const projectsQuery = useQuery({
    queryKey,
    queryFn: listProjects,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const planLinksQuery = useQuery({
    queryKey: ["projects", "plan-links", activeWorkspaceId ?? "no-workspace"],
    queryFn: listProjectPlanLinks,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
    void queryClient.invalidateQueries({ queryKey: ["projects", "plan-links"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: ProjectCreateRequest) => createProject(payload),
    onSuccess: () => {
      toast.success("Project created");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string; payload: ProjectUpdateRequest }) =>
      updateProject(projectId, payload),
    onSuccess: () => {
      toast.success("Project updated");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update project");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      toast.success("Project deleted");
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  const openFolderMutation = useMutation({
    mutationFn: (projectId: string) => openProjectFolder(projectId),
    onSuccess: (payload) => {
      const editorLabel = payload.editor ? ` in ${payload.editor}` : "";
      toast.success(`Opened project folder${editorLabel}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to open project folder");
    },
  });

  return {
    projectsQuery,
    planLinksQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    openFolderMutation,
  };
}
