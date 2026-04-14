import { useQuery } from "@tanstack/react-query";

import { getSourceControlBranchDetails, getSourceControlPreview } from "@/features/source-control/api";

export function useSourceControl(projectId: string | null) {
  return useQuery({
    queryKey: ["source-control", "preview", projectId ?? "default"],
    queryFn: () => getSourceControlPreview({ projectId }),
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useSourceControlBranchDetails(projectId: string | null, branch: string | null) {
  return useQuery({
    queryKey: ["source-control", "branch-details", projectId ?? "default", branch ?? "none"],
    queryFn: () =>
      getSourceControlBranchDetails({
        projectId,
        branch: branch ?? "",
      }),
    enabled: Boolean(branch && branch.trim().length > 0),
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
