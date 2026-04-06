import { Activity, ArrowRightLeft, CheckCircle2, Clock3, Gauge, Monitor, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StoragePage() {
  const currentCapabilities = [
    {
      title: "Detects official Codex CLI login activity",
      description:
        "The dashboard picks up active Codex CLI login/session signals so you can see account state in one place.",
      icon: Activity,
    },
    {
      title: "Live account status instead of manual /status checks",
      description:
        "You get near real-time visibility in the UI, so you don't need to keep checking terminal status output.",
      icon: Monitor,
    },
    {
      title: "Fast account switching for 5-hour limits",
      description:
        "When one account hits limits, switching to the next account is straightforward and built into the workflow.",
      icon: ArrowRightLeft,
    },
    {
      title: "Reset-window planning for multi-account setups",
      description:
        "Working with many accounts becomes easier because usage windows and resets are visible and trackable.",
      icon: Clock3,
    },
  ];

  const workflowBenefits = [
    "More uninterrupted work time across multiple accounts.",
    "Less context-switching between terminals and dashboard.",
    "Clearer view of when to rotate accounts.",
  ];

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Storage</h1>
          <Badge variant="secondary" className="border border-border/70">
            Coming soon
          </Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
          Secure storage for devices and API environment values is still in progress. While this page
          ships, the dashboard already solves the biggest day-to-day account switching pain points.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">What the dashboard currently does</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {currentCapabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <Card key={capability.title} className="gap-4 py-5">
                <CardHeader className="px-5">
                  <CardTitle className="flex items-start gap-2 text-base leading-snug">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{capability.title}</span>
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {capability.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Why this improves daily work</CardTitle>
            <CardDescription>
              Based on user feedback: less manual checking, faster switching, and better usage planning.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pt-0">
            <ul className="space-y-2">
              {workflowBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Next updates in progress
            </CardTitle>
            <CardDescription>Roadmap items requested in community feedback.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-5 pt-0 text-sm text-muted-foreground">
            <p>• Direct in-app comparison (multi-account usage vs single Pro-style usage) is being built.</p>
            <p>• VS Code behavior parity is being validated with live account status feedback.</p>
            <p>• Secure storage for device and API environment data lands here next.</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" asChild>
          <a href="/dashboard">Open dashboard</a>
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <a href="/accounts">Open accounts</a>
        </Button>
      </div>
    </div>
  );
}
