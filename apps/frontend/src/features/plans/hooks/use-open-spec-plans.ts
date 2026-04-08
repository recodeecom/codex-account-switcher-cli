import { useQuery } from "@tanstack/react-query";

import { getOpenSpecPlan, listOpenSpecPlans } from "@/features/plans/api";

export function useOpenSpecPlans(selectedSlug: string | null) {
  const plansQuery = useQuery({
    queryKey: ["projects", "plans", "list"],
    queryFn: listOpenSpecPlans,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const planDetailQuery = useQuery({
    queryKey: ["projects", "plans", "detail", selectedSlug],
    queryFn: () => getOpenSpecPlan(selectedSlug ?? ""),
    enabled: Boolean(selectedSlug),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return {
    plansQuery,
    planDetailQuery,
  };
}
