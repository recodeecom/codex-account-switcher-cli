import { useMemo } from "react";

import { DonutChart } from "@/components/donut-chart";
import type { RequestLogUsageFallbackState } from "@/features/dashboard/request-log-usage-fallback";
import type { AccountSummary, RequestLogUsageSummary } from "@/features/dashboard/schemas";
import { buildAccountIdentityKey } from "@/utils/account-identifiers";
import { formatCompactNumber, formatEuro, formatWindowLabel } from "@/utils/formatters";

export type RequestLogUsageDonutsProps = {
  accounts: AccountSummary[];
  usageSummary: RequestLogUsageSummary;
  fallback: RequestLogUsageFallbackState;
  primaryWindowMinutes?: number | null;
};

type DonutLegendItem = {
  id: string;
  label: string;
  labelSuffix: string;
  isEmail: boolean;
  value: number;
  costEur: number;
};

type UsageSummaryWindow = RequestLogUsageSummary["last5h"];

type UsageWindowStats = {
  activeAccounts: number;
  avgTokensPerAccount: number;
  topAccountLabel: string;
  topAccountShare: number;
};

function formatTokensAsThousands(value: number): string {
  if (!Number.isFinite(value)) {
    return "--";
  }
  const normalized = Math.max(0, value);
  return formatCompactNumber(normalized * 1000);
}

function buildDonutItems(accounts: AccountSummary[], window: UsageSummaryWindow): DonutLegendItem[] {
  const tokensByAccount = new Map<string, number>();
  const costEurByAccount = new Map<string, number>();
  let unassignedTokens = 0;
  let unassignedCostEur = 0;

  for (const row of window.accounts) {
    if (!row.accountId) {
      unassignedTokens += row.tokens;
      unassignedCostEur += row.costEur;
      continue;
    }
    tokensByAccount.set(row.accountId, row.tokens);
    costEurByAccount.set(row.accountId, row.costEur);
  }

  const groupedItems = new Map<
    string,
    {
      id: string;
      label: string;
      isEmail: boolean;
      value: number;
      costEur: number;
      count: number;
    }
  >();

  for (const account of accounts) {
    const rawLabel = account.displayName || account.email || account.accountId;
    const isEmail = !!account.email && rawLabel === account.email;
    const identityKey = buildAccountIdentityKey(account);
    const accountValue = Math.max(0, tokensByAccount.get(account.accountId) ?? 0);
    const accountCostEur = Math.max(0, costEurByAccount.get(account.accountId) ?? 0);
    const existing = groupedItems.get(identityKey);
    if (!existing) {
      groupedItems.set(identityKey, {
        id: `identity:${identityKey}`,
        label: rawLabel,
        isEmail,
        value: accountValue,
        costEur: accountCostEur,
        count: 1,
      });
      continue;
    }
    groupedItems.set(identityKey, {
      ...existing,
      value: existing.value + accountValue,
      costEur: existing.costEur + accountCostEur,
      count: existing.count + 1,
    });
  }

  const items: DonutLegendItem[] = Array.from(groupedItems.values()).map((item) => ({
    id: item.id,
    label: item.label,
    labelSuffix: item.count > 1 ? ` (×${item.count})` : "",
    isEmail: item.isEmail,
    value: item.value,
    costEur: item.costEur,
  }));

  const knownAccountIds = new Set(accounts.map((account) => account.accountId));
  const unknownRowsByAccountId = new Map<
    string,
    { accountId: string; accountEmail: string | null; tokens: number; costEur: number }
  >();
  for (const row of window.accounts) {
    if (!row.accountId || knownAccountIds.has(row.accountId)) {
      continue;
    }
    const existing = unknownRowsByAccountId.get(row.accountId);
    if (!existing) {
      unknownRowsByAccountId.set(row.accountId, {
        accountId: row.accountId,
        accountEmail: row.accountEmail ?? null,
        tokens: Math.max(0, row.tokens),
        costEur: Math.max(0, row.costEur),
      });
      continue;
    }
    unknownRowsByAccountId.set(row.accountId, {
      accountId: row.accountId,
      accountEmail: existing.accountEmail ?? row.accountEmail ?? null,
      tokens: existing.tokens + Math.max(0, row.tokens),
      costEur: existing.costEur + Math.max(0, row.costEur),
    });
  }
  const unknownRows = Array.from(unknownRowsByAccountId.values()).sort((left, right) =>
    left.accountId.localeCompare(right.accountId),
  );

  for (const row of unknownRows) {
    if (!row.accountId) continue;
    items.push({
      id: row.accountId,
      label: row.accountEmail || row.accountId,
      labelSuffix: "",
      isEmail: !!row.accountEmail,
      value: row.tokens,
      costEur: row.costEur,
    });
  }

  if (unassignedTokens > 0) {
    items.push({
      id: "__unassigned__",
      label: "Unassigned",
      labelSuffix: "",
      isEmail: false,
      value: unassignedTokens,
      costEur: Math.max(0, unassignedCostEur),
    });
  }

  return items;
}

function buildWindowStats(items: DonutLegendItem[], totalTokens: number): UsageWindowStats {
  const assignedItems = items.filter((item) => item.id !== "__unassigned__");
  const activeAssigned = assignedItems.filter((item) => item.value > 0);
  const topItem = [...items]
    .sort((left, right) => right.value - left.value)
    .find((item) => item.value > 0);

  const activeAccounts = activeAssigned.length;
  const avgTokensPerAccount = activeAccounts > 0
    ? Math.round(totalTokens / activeAccounts)
    : 0;
  const topAccountShare = totalTokens > 0 && topItem
    ? (topItem.value / totalTokens) * 100
    : 0;

  return {
    activeAccounts,
    avgTokensPerAccount,
    topAccountLabel: topItem ? `${topItem.label}${topItem.labelSuffix}` : "No activity",
    topAccountShare,
  };
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/65 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function RequestLogUsageDonuts({
  accounts,
  usageSummary,
  fallback,
  primaryWindowMinutes = null,
}: RequestLogUsageDonutsProps) {
  const primaryWindowLabel = formatWindowLabel("primary", primaryWindowMinutes);
  const items5h = useMemo(
    () => buildDonutItems(accounts, usageSummary.last5h),
    [accounts, usageSummary.last5h],
  );

  const items7d = useMemo(
    () => buildDonutItems(accounts, usageSummary.last7d),
    [accounts, usageSummary.last7d],
  );

  const total5h = Math.max(
    usageSummary.last5h.totalTokens,
    items5h.reduce((total, item) => total + item.value, 0),
  );
  const totalCostEur5h = Math.max(
    usageSummary.last5h.totalCostEur,
    items5h.reduce((total, item) => total + item.costEur, 0),
  );
  const total7d = Math.max(
    usageSummary.last7d.totalTokens,
    items7d.reduce((total, item) => total + item.value, 0),
  );
  const totalCostEur7d = Math.max(
    usageSummary.last7d.totalCostEur,
    items7d.reduce((total, item) => total + item.costEur, 0),
  );
  const totalCostEur30d = Math.max(
    usageSummary.last30d.totalCostEur,
    usageSummary.last30d.accounts.reduce((total, item) => total + item.costEur, 0),
  );
  const stats5h = useMemo(() => buildWindowStats(items5h, total5h), [items5h, total5h]);
  const stats7d = useMemo(() => buildWindowStats(items7d, total7d), [items7d, total7d]);
  const recentWindowWeight = total7d > 0 ? Math.min(100, (total5h / total7d) * 100) : 0;
  const fxHint = `Fixed FX ${usageSummary.fxRateUsdToEur.toFixed(2)} USD/EUR`;
  const fallbackHint = "Estimated from live fallback tokens with a minimum-rate guardrail";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard
          label={`${primaryWindowLabel} Tokens`}
          value={formatTokensAsThousands(total5h)}
          hint={`${stats5h.activeAccounts} active accounts`}
        />
        <StatCard
          label="7d Tokens"
          value={formatTokensAsThousands(total7d)}
          hint={`${stats7d.activeAccounts} active accounts`}
        />
        <StatCard
          label={`${primaryWindowLabel} EUR`}
          value={formatEuro(totalCostEur5h)}
          hint={fallback.last5h ? fallbackHint : fxHint}
        />
        <StatCard
          label="7d EUR"
          value={formatEuro(totalCostEur7d)}
          hint={fallback.last7d ? fallbackHint : fxHint}
        />
        <StatCard
          label="30d EUR"
          value={formatEuro(totalCostEur30d)}
          hint={fxHint}
        />
        <StatCard
          label="Avg / active account"
          value={formatTokensAsThousands(stats7d.avgTokensPerAccount)}
          hint="Based on 7d consumption"
        />
        <StatCard
          label="Recent intensity"
          value={`${Math.round(recentWindowWeight)}%`}
          hint={`${primaryWindowLabel} share of 7d volume`}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DonutChart
          title={`${primaryWindowLabel} Consumed`}
          subtitle={`Top: ${stats5h.topAccountLabel} · ${Math.round(stats5h.topAccountShare)}%`}
          centerLabel="Consumed"
          centerValue={formatTokensAsThousands(total5h)}
          items={items5h}
          total={total5h}
          legendValueFormatter={(item) => formatTokensAsThousands(item.value)}
          centerSubvalue={formatEuro(totalCostEur5h)}
          legendSecondaryFormatter={(item) => formatEuro(item.costEur ?? 0)}
        />
        <DonutChart
          title="Weekly Consumed"
          subtitle={`Top: ${stats7d.topAccountLabel} · ${Math.round(stats7d.topAccountShare)}%`}
          centerLabel="Consumed"
          centerValue={formatTokensAsThousands(total7d)}
          items={items7d}
          total={total7d}
          legendValueFormatter={(item) => formatTokensAsThousands(item.value)}
          centerSubvalue={formatEuro(totalCostEur7d)}
          legendSecondaryFormatter={(item) => formatEuro(item.costEur ?? 0)}
        />
      </div>
      {fallback.active ? (
        <p className="text-xs text-muted-foreground">
          Using live usage fallback because recent request logs are empty.
        </p>
      ) : null}
    </div>
  );
}
