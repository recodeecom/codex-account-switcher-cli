import { useQuery } from "@tanstack/react-query";

import { getBillingAccounts } from "@/features/billing/api";

export function useBilling() {
  const billingQuery = useQuery({
    queryKey: ["billing", "summary"],
    queryFn: getBillingAccounts,
    refetchOnWindowFocus: true,
  });

  return {
    billingQuery,
  };
}
