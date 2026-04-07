"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CodexLogo } from "@/components/brand/codex-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountCard } from "@/features/dashboard/components/account-card";
import type { AccountSummary } from "@/features/dashboard/schemas";

const DEMO_ACCOUNT_CARD: AccountSummary = {
  accountId: "coming-soon-demo-account",
  email: "demo@demo.com",
  displayName: "demo@demo.com",
  planType: "team",
  status: "active",
  usage: {
    primaryRemainingPercent: 73,
    secondaryRemainingPercent: 38,
  },
  resetAtPrimary: new Date(
    Date.now() + (4 * 60 + 37) * 60 * 1000,
  ).toISOString(),
  resetAtSecondary: new Date(
    Date.now() + (6 * 24 * 60 + 23 * 60) * 60 * 1000,
  ).toISOString(),
  lastUsageRecordedAtPrimary: new Date().toISOString(),
  lastUsageRecordedAtSecondary: new Date().toISOString(),
  windowMinutesPrimary: 300,
  windowMinutesSecondary: 10080,
  requestUsage: {
    requestCount: 0,
    totalTokens: 216000,
    cachedInputTokens: 0,
    totalCostUsd: 0,
  },
  codexLiveSessionCount: 1,
  codexTrackedSessionCount: 1,
  codexSessionCount: 1,
  codexCurrentTaskPreview: "Agent waiting for email address",
  codexLastTaskPreview: null,
  codexSessionTaskPreviews: [
    {
      sessionKey: "demo-session-1",
      taskPreview: "Waiting for email address",
      taskUpdatedAt: new Date().toISOString(),
    },
  ],
  codexAuth: {
    hasSnapshot: true,
    snapshotName: "demo@demo.com",
    activeSnapshotName: "demo@demo.com",
    isActiveSnapshot: true,
    hasLiveSession: true,
    liveUsageConfidence: "high",
    expectedSnapshotName: "demo@demo.com",
    snapshotNameMatchesEmail: true,
  },
  additionalQuotas: [],
};

type Point = {
  x: number;
  y: number;
};

type ArrowGeometry = {
  width: number;
  height: number;
  path: string;
  showArrow: boolean;
};

type InfoItem = {
  title: string;
  body: string;
};

const WHAT_IT_DOES: InfoItem[] = [
  {
    title: "See account state in one place",
    body:
      "Detect official Codex CLI login and session signals so your dashboard matches reality without manual detective work.",
  },
  {
    title: "Stop checking /status every five minutes",
    body:
      "Live account visibility means fewer terminal detours and less context switching while you are in the middle of real work.",
  },
  {
    title: "Rotate faster when a quota gets tight",
    body:
      "Fast account switching for 5-hour limits makes it easier to keep moving when one account starts running out of room.",
  },
  {
    title: "Plan reset windows with less guessing",
    body:
      "Visible usage windows make multi-account setups easier to reason about, especially when the day gets chaotic.",
  },
];

const WHY_IT_HELPS: InfoItem[] = [
  {
    title: "More uninterrupted work time",
    body:
      "The goal is not just better stats. The goal is protecting long, useful stretches of work across multiple accounts.",
  },
  {
    title: "Less dashboard-terminal ping-pong",
    body:
      "You should not need a dozen tiny checks to decide what to do next. recodee gives you the next useful view faster.",
  },
  {
    title: "Clearer timing decisions",
    body:
      "When to wait, when to switch, and when to push ahead should feel obvious instead of approximate.",
  },
];

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return `${value}`;
}

function useCompactLayout(): boolean {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 1279px)");
    const update = () => setIsCompact(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return isCompact;
}

function buildArrowPath(
  start: Point,
  end: Point,
  width: number,
  height: number,
  isCompact: boolean,
): string {
  if (isCompact) {
    const verticalDistance = Math.max(end.y - start.y, 64);
    const c1x = clamp(start.x + 14, 16, width - 16);
    const c1y = clamp(start.y + verticalDistance * 0.32, start.y + 24, end.y - 36);
    const c2x = clamp(end.x + 16, 16, width - 16);
    const c2y = clamp(end.y - verticalDistance * 0.4, start.y + 46, end.y - 20);

    return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
  }

  const horizontalDistance = Math.max(end.x - start.x, 48);
  const verticalDistance = Math.max(end.y - start.y, 84);
  const c1x = clamp(start.x + horizontalDistance * 0.34, start.x + 24, width - 40);
  const c1y = clamp(start.y + 24, 12, height - 24);
  const c2x = clamp(end.x - horizontalDistance * 0.24, 24, width - 28);
  const c2y = clamp(end.y - verticalDistance * 0.3, start.y + 30, end.y - 20);

  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

function useArrowGeometry({
  containerRef,
  triggerRef,
  targetRef,
  isCompact,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLSpanElement | null>;
  targetRef: React.RefObject<HTMLDivElement | null>;
  isCompact: boolean;
}): ArrowGeometry {
  const [geometry, setGeometry] = useState<ArrowGeometry>({
    width: 0,
    height: 0,
    path: "",
    showArrow: false,
  });

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const trigger = triggerRef.current;
    const target = targetRef.current;

    if (!container || !trigger || !target) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const width = containerRect.width;
    const height = containerRect.height;

    const start: Point = {
      x: triggerRect.left - containerRect.left + triggerRect.width * 0.52,
      y: triggerRect.bottom - containerRect.top + 6,
    };

    const end: Point = isCompact
      ? {
          x: targetRect.left - containerRect.left + targetRect.width * 0.5,
          y: targetRect.top - containerRect.top - 8,
        }
      : {
          x:
            targetRect.left -
            containerRect.left +
            Math.min(targetRect.width * 0.34, 170),
          y: targetRect.top - containerRect.top + 8,
        };

    const path = buildArrowPath(start, end, width, height, isCompact);

    setGeometry({
      width,
      height,
      path,
      showArrow: true,
    });
  }, [containerRef, isCompact, targetRef, triggerRef]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    const container = containerRef.current;
    const trigger = triggerRef.current;
    const target = targetRef.current;

    if (!container || !trigger || !target) {
      return;
    }

    const observer = new ResizeObserver(() => recompute());

    observer.observe(container);
    observer.observe(trigger);
    observer.observe(target);

    const frame = window.requestAnimationFrame(recompute);
    window.addEventListener("resize", recompute);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", recompute);
      observer.disconnect();
    };
  }, [containerRef, recompute, targetRef, triggerRef]);

  return geometry;
}

function BulletList({ items }: { items: InfoItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.title} className="flex gap-3">
          <div className="pt-2">
            <span className="block h-1.5 w-1.5 rounded-full bg-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100 sm:text-[15px]">
              {item.title}
            </p>
            <p className="mt-1 text-sm leading-7 text-zinc-400">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-7 text-zinc-400">{description}</p>
    </div>
  );
}

function ArrowOverlay({
  width,
  height,
  path,
  showArrow,
}: ArrowGeometry) {
  if (!showArrow) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="drop-arrow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
          <stop offset="58%" stopColor="rgba(186,230,253,0.92)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0.86)" />
        </linearGradient>

        <filter id="drop-arrow-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <marker
          id="drop-arrow-head"
          markerWidth="14"
          markerHeight="14"
          refX="10"
          refY="7"
          orient="auto"
        >
          <path d="M0 0 L14 7 L0 14 L4 7 Z" fill="rgba(255,255,255,0.95)" />
        </marker>
      </defs>

      <path
        d={path}
        fill="none"
        stroke="url(#drop-arrow-gradient)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#drop-arrow-glow)"
        markerEnd="url(#drop-arrow-head)"
      />
    </svg>
  );
}

function AmbientLights() {
  return (
    <>
      <div className="pointer-events-none absolute left-[-12%] top-[-6%] h-[280px] w-[280px] rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10%] top-[8%] h-[320px] w-[320px] rounded-full bg-blue-500/7 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[10%] right-[8%] h-[220px] w-[220px] rounded-full bg-emerald-500/6 blur-3xl" />
    </>
  );
}

function HeroPills() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5 text-xs text-zinc-300 sm:text-sm">
      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/90" />
        live usage awareness
      </div>
      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/90" />
        smarter account rotation
      </div>
      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-300/90" />
        less quota guesswork
      </div>
    </div>
  );
}

function ValueStrip() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          May your tokens last forever.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
          recodee is the dashboard you wish you already had when quotas get weird,
          sessions get messy, and you just want the next useful answer fast.
        </p>
        <p className="mt-1.5 text-sm font-medium text-zinc-300 sm:text-base">
          A dashboard that helps them go a lot further.
        </p>
      </div>
    </div>
  );
}

function FunFactCard() {
  return (
    <div className="mx-auto w-full max-w-4xl px-2 pt-8 sm:px-0 sm:pt-12">
      <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(6,12,24,0.96)_0%,rgba(3,7,16,0.98)_100%)] p-[1px] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(34,211,238,0.12),transparent_42%),radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.09),transparent_36%)]" />
        <div className="relative rounded-[27px] px-6 py-7 text-center sm:px-10 sm:py-9">
          <div className="mb-4 flex justify-center">
            <CodexLogo size={42} title="recodee.com logo" className="opacity-95" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 ring-1 ring-cyan-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            Fun Fact
          </div>

          <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-[2rem]">
            We built recodee with recodee. We call that confidence.
          </p>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Very on-brand. Also genuinely useful.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium tracking-[0.12em] text-cyan-100 ring-1 ring-cyan-400/20 sm:text-sm">
              codex tokens used: 3B
            </span>
            <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium tracking-[0.12em] text-emerald-100 ring-1 ring-emerald-400/20 sm:text-sm">
              money saved: $10k+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComingSoonPage() {
  const [agentEmail, setAgentEmail] = useState("");

  const hasValidAgentEmail = isValidEmailAddress(agentEmail);
  const isCompact = useCompactLayout();

  const heroSectionRef = useRef<HTMLDivElement>(null);
  const dropWordRef = useRef<HTMLSpanElement>(null);
  const emailInputAnchorRef = useRef<HTMLDivElement>(null);

  const arrow = useArrowGeometry({
    containerRef: heroSectionRef,
    triggerRef: dropWordRef,
    targetRef: emailInputAnchorRef,
    isCompact,
  });

  const demoAccount = useMemo<AccountSummary>(() => {
    return {
      ...DEMO_ACCOUNT_CARD,
      codexCurrentTaskPreview: hasValidAgentEmail
        ? "Waiting for user to press Submit."
        : "Agent waiting for email address",
      codexSessionTaskPreviews: [
        {
          sessionKey: "demo-session-1",
          taskPreview: hasValidAgentEmail
            ? "Waiting for user to press Submit"
            : "Waiting for email address",
          taskUpdatedAt: new Date().toISOString(),
        },
      ],
    };
  }, [hasValidAgentEmail]);

  return (
    <main className="min-h-screen bg-background p-3 sm:p-4">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card px-4 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.35)] sm:px-5 sm:py-5">
        <AmbientLights />

        <div className="grid gap-6 xl:grid-cols-[1.32fr_1fr] xl:items-start">
          <div className="xl:h-full">
            <div className="overflow-hidden rounded-2xl bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <img
                src="/commingsoon.jpg"
                alt="Dashboard preview"
                className="h-[260px] w-full object-cover object-top sm:h-[300px] lg:h-[340px] xl:h-[1000px]"
                loading="lazy"
              />
            </div>
          </div>

          <div ref={heroSectionRef} className="relative">
            <ArrowOverlay {...arrow} />

            <div className="relative z-10">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.55)]" />
                  recodee preview
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-5">
                  <div className="inline-flex items-center gap-3">
                    <CodexLogo size={60} title="recodee.com logo" />
                    <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      recodee.com
                    </p>
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                    Coming Soon
                  </h1>
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8">
                  We’re building something dangerously useful.{" "}
                  <span ref={dropWordRef} className="font-semibold text-zinc-100">
                    Drop
                  </span>{" "}
                  your email and we’ll let you know the moment it’s ready.
                </p>

                <HeroPills />
                <ValueStrip />
              </div>

              <div className="relative z-10 mt-6 space-y-5 sm:mt-8">
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 backdrop-blur-sm">
                  <SectionHeading
                    title="What the dashboard currently does"
                    description="Built around official Codex account and session signals so you can decide faster and rotate accounts with less friction."
                  />
                  <BulletList items={WHAT_IT_DOES} />
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 backdrop-blur-sm">
                  <SectionHeading
                    title="Why this improves daily work"
                    description="This is about protecting focused work blocks, not just making a prettier dashboard."
                  />
                  <BulletList items={WHY_IT_HELPS} />
                </div>

                <div
                  className="space-y-3 rounded-2xl border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(9,18,34,0.55)_0%,rgba(4,10,20,0.7)_100%)] px-4 py-4"
                  ref={emailInputAnchorRef}
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                    Demo usage snapshot ·{" "}
                    <span className="text-zinc-200">
                      {formatTokenCount(demoAccount.requestUsage?.totalTokens ?? 0)} tokens
                    </span>
                  </p>
                  <div className="w-full max-w-[560px]">
                    <AccountCard
                      account={demoAccount}
                      useLocalBusy={!hasValidAgentEmail}
                      deleteBusy
                      initialSessionTasksCollapsed
                      disableSecondaryActions
                      forceWorkingIndicator
                      primaryActionLabel="Submit"
                      primaryActionAriaLabel="Submit account tutorial"
                      taskPanelAddon={
                        <div className="mt-2">
                          <Input
                            type="email"
                            value={agentEmail}
                            onChange={(event) => {
                              setAgentEmail(event.currentTarget.value);
                            }}
                            placeholder="Enter email address"
                            aria-label="Agent email address"
                            className="h-10 border-white/14 bg-black/55 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-cyan-400/35 focus-visible:ring-cyan-500/20"
                          />
                        </div>
                      }
                      onAction={() => {}}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href="/dashboard">Open dashboard</a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href="/accounts">Open accounts</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FunFactCard />
    </main>
  );
}
