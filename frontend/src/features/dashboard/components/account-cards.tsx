import { useMemo } from "react";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AccountCard, type AccountCardProps } from "@/features/dashboard/components/account-card";
import type { AccountSummary, UsageWindow } from "@/features/dashboard/schemas";
import { buildDuplicateAccountIdSet } from "@/utils/account-identifiers";

export type AccountCardsProps = {
  accounts: AccountSummary[];
  primaryWindow: UsageWindow | null;
  secondaryWindow: UsageWindow | null;
  useLocalBusy?: boolean;
  onAction?: AccountCardProps["onAction"];
};

function buildConsumedByAccount(window: UsageWindow | null): Map<string, number> {
  const consumedByAccount = new Map<string, number>();
  if (!window) return consumedByAccount;

  for (const row of window.accounts) {
    consumedByAccount.set(row.accountId, Math.max(0, row.capacityCredits - row.remainingCredits));
  }

  return consumedByAccount;
}

function resolveCardTokensUsed(
  account: AccountSummary,
  primaryConsumedByAccount: Map<string, number>,
  secondaryConsumedByAccount: Map<string, number>,
): number {
  const weeklyOnly = account.windowMinutesPrimary == null && account.windowMinutesSecondary != null;
  const primaryConsumed = primaryConsumedByAccount.get(account.accountId);
  const secondaryConsumed = secondaryConsumedByAccount.get(account.accountId);

  if (weeklyOnly && secondaryConsumed != null) {
    return secondaryConsumed;
  }

  if (primaryConsumed != null) {
    return primaryConsumed;
  }

  if (secondaryConsumed != null) {
    return secondaryConsumed;
  }

  return account.requestUsage?.totalTokens ?? 0;
}

export function AccountCards({
  accounts,
  primaryWindow,
  secondaryWindow,
  useLocalBusy = false,
  onAction,
}: AccountCardsProps) {
  const duplicateAccountIds = useMemo(() => buildDuplicateAccountIdSet(accounts), [accounts]);
  const primaryConsumedByAccount = useMemo(() => buildConsumedByAccount(primaryWindow), [primaryWindow]);
  const secondaryConsumedByAccount = useMemo(() => buildConsumedByAccount(secondaryWindow), [secondaryWindow]);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No accounts connected yet"
        description="Import or authenticate an account to get started."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account, index) => (
        <div key={account.accountId} className="animate-fade-in-up" style={{ animationDelay: `${index * 75}ms` }}>
          <AccountCard
            account={account}
            tokensUsed={resolveCardTokensUsed(account, primaryConsumedByAccount, secondaryConsumedByAccount)}
            showAccountId={duplicateAccountIds.has(account.accountId)}
            useLocalBusy={useLocalBusy}
            onAction={onAction}
          />
        </div>
      ))}
    </div>
  );
}
