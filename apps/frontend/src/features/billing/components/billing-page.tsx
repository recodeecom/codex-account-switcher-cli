import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BusinessPlanAccount = {
  id: string;
  domain: string;
  chatgptSeatsInUse: number;
  codexSeatsInUse: number;
};

const CHATGPT_MONTHLY_SEAT_PRICE_EUR = 26;
const BILLING_CYCLE_START = new Date(2026, 2, 23);
const BILLING_CYCLE_END = new Date(2026, 3, 23);

const BUSINESS_PLAN_ACCOUNTS: BusinessPlanAccount[] = [
  {
    id: "business-plan-edixai",
    domain: "edixai.com",
    chatgptSeatsInUse: 5,
    codexSeatsInUse: 5,
  },
  {
    id: "business-plan-kozpont",
    domain: "kozpontihusbolt.hu",
    chatgptSeatsInUse: 5,
    codexSeatsInUse: 5,
  },
];

export function BillingPage() {
  const [businessPlanDetailsOpen, setBusinessPlanDetailsOpen] = useState(false);

  const cycleLabel = useMemo(
    () => `${format(BILLING_CYCLE_START, "MMM d")} - ${format(BILLING_CYCLE_END, "MMM d")}`,
    [],
  );

  const businessPlanTotals = useMemo(
    () =>
      BUSINESS_PLAN_ACCOUNTS.reduce(
        (accumulator, account) => ({
          chatgptSeatsInUse: accumulator.chatgptSeatsInUse + account.chatgptSeatsInUse,
          codexSeatsInUse: accumulator.codexSeatsInUse + account.codexSeatsInUse,
        }),
        { chatgptSeatsInUse: 0, codexSeatsInUse: 0 },
      ),
    [],
  );

  const businessPlanTotalMonthlyCost = useMemo(
    () =>
      BUSINESS_PLAN_ACCOUNTS.reduce(
        (accumulator, account) =>
          accumulator + account.chatgptSeatsInUse * CHATGPT_MONTHLY_SEAT_PRICE_EUR,
        0,
      ),
    [],
  );

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View all business accounts in your plan and track combined monthly seat costs.
        </p>
      </div>

      <Card className="overflow-hidden border-border/70">
        <CardHeader className="space-y-4 bg-card/70 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-3xl">Business Plan</CardTitle>
                <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">Monthly</Badge>
              </div>
              <p className="mt-2 flex items-center gap-2 text-base text-muted-foreground">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                Current cycle: {cycleLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => setBusinessPlanDetailsOpen(true)}
              >
                Business plan details
              </Button>
              <Button type="button" variant="secondary" className="rounded-full px-5">
                Switch to annual billing and save 19%
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="rounded-xl bg-indigo-100/90 px-4 py-3 text-base font-medium text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-100">
            Up to 5 seats free for 1 month
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business account</TableHead>
                <TableHead>ChatGPT seats</TableHead>
                <TableHead>Codex seats</TableHead>
                <TableHead>Monthly ChatGPT cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BUSINESS_PLAN_ACCOUNTS.map((account) => {
                const accountMonthlyCost = account.chatgptSeatsInUse * CHATGPT_MONTHLY_SEAT_PRICE_EUR;
                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.domain}</TableCell>
                    <TableCell>{account.chatgptSeatsInUse} seats in use</TableCell>
                    <TableCell>{account.codexSeatsInUse} seats in use</TableCell>
                    <TableCell>€{accountMonthlyCost}/month</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Separator />

          <div className="space-y-1">
            <p className="text-lg font-semibold">
              ChatGPT seats in use: {businessPlanTotals.chatgptSeatsInUse}
            </p>
            <p className="text-lg font-semibold">Codex seats in use: {businessPlanTotals.codexSeatsInUse}</p>
            <p className="text-sm text-muted-foreground">
              Total business plan monthly cost: €{businessPlanTotalMonthlyCost}/month · Renews on{" "}
              {format(BILLING_CYCLE_END, "MMM d")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={businessPlanDetailsOpen} onOpenChange={setBusinessPlanDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Business plan details</DialogTitle>
            <DialogDescription>
              Full multi-account overview with total active seats and monthly business-plan totals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business account</TableHead>
                  <TableHead>ChatGPT seats</TableHead>
                  <TableHead>Codex seats</TableHead>
                  <TableHead>Monthly ChatGPT cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {BUSINESS_PLAN_ACCOUNTS.map((account) => {
                  const accountMonthlyCost =
                    account.chatgptSeatsInUse * CHATGPT_MONTHLY_SEAT_PRICE_EUR;
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.domain}</TableCell>
                      <TableCell>{account.chatgptSeatsInUse} seats in use</TableCell>
                      <TableCell>{account.codexSeatsInUse} seats in use</TableCell>
                      <TableCell>€{accountMonthlyCost}/month</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="space-y-2 rounded-xl border border-border/80 bg-muted/50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Total business plan monthly cost: €{businessPlanTotalMonthlyCost}/month
                </p>
                <p className="text-xs text-muted-foreground">Renews on {format(BILLING_CYCLE_END, "MMM d")}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Combined seats in use: {businessPlanTotals.chatgptSeatsInUse} ChatGPT and{" "}
                {businessPlanTotals.codexSeatsInUse} Codex.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
