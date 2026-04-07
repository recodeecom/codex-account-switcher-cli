import { useQuery } from "@tanstack/react-query";

import { getMedusaConnectionSnapshot } from "@/lib/medusa/store";

export function useMedusaConnection() {
  return useQuery({
    queryKey: ["settings", "medusa-connection"],
    queryFn: getMedusaConnectionSnapshot,
    retry: 1,
    staleTime: 30_000,
  });
}
