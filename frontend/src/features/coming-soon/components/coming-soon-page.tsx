"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ChevronDown, Clock, ExternalLink, SquareTerminal, Trash2 } from "lucide-react";

import { CodexLogo } from "@/components/brand/codex-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ComingSoonPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      return;
    }

    setSubmittedEmail(email);
    event.currentTarget.reset();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-4xl rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-10">
        <div className="mb-8 overflow-hidden rounded-xl border border-border/60 bg-black/30 p-2">
          <div className="aspect-[16/7]">
            <img
              src="/commingsoon.jpg"
              alt="Dashboard preview"
              className="h-full w-full object-contain object-center"
              loading="lazy"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="inline-flex items-center gap-3">
            <CodexLogo size={62} title="recodee.com logo" />
            <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              recodee.com
            </p>
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Coming Soon
          </h1>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          We are preparing something new for recodee.com. If you are interested,
          enter your email address below and hit submit.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                What the dashboard currently does
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  Detects official Codex CLI login/session signals so you can see
                  account state in one place.
                </li>
                <li>
                  Live account status instead of manual <code>/status</code>{" "}
                  checks.
                </li>
                <li>
                  Fast account switching for 5-hour limits when one account hits
                  quota.
                </li>
                <li>
                  Reset-window planning for multi-account setups with visible usage
                  windows.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Why this improves daily work
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>More uninterrupted work time across multiple accounts.</li>
                <li>Less context-switching between terminals and dashboard.</li>
                <li>Clearer view of when to rotate accounts.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-500/20 bg-[linear-gradient(160deg,rgba(11,31,58,0.98)_0%,rgba(10,22,43,0.99)_54%,rgba(9,16,32,1)_100%)] p-4 shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
              <div className="rounded-2xl border border-white/10 bg-[linear-gradient(165deg,rgba(15,34,64,0.96)_0%,rgba(11,21,40,0.98)_100%)] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-100">
                      OPENAI
                    </p>
                    <p className="text-xs font-medium tracking-[0.14em] text-slate-300">
                      TEAM · demo@demo.com
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      Active
                    </span>
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-300">
                      TOKEN CARD
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                    <p className="text-[10px] font-medium tracking-[0.13em] text-slate-400">
                      TOKENS:
                    </p>
                    <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-white">
                      81k
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
                    <p className="text-[10px] font-medium tracking-[0.13em] text-slate-400">
                      CLI SESSIONS:
                    </p>
                    <p className="mt-1 text-3xl font-semibold leading-none tracking-tight text-white">
                      3
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-white/10 bg-black/25 p-2.5">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">5h</span>
                      <span className="rounded-full border border-emerald-300/25 bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-300">
                        73%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-cyan-500/20">
                      <div className="h-full w-[73%] rounded-full bg-cyan-300" />
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      in 4h 37m
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">last seen 1m ago</p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/25 p-2.5">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">DUMMY WEEKLY</span>
                      <span className="rounded-full border border-emerald-300/25 bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-300">
                        38%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-cyan-500/20">
                      <div className="h-full w-[38%] rounded-full bg-cyan-300" />
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      in 6d 23h
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">last seen 1m ago</p>
                  </div>
                </div>

                <p className="mt-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-200">
                  No active task reported
                </p>

                <div className="mt-3 border-t border-white/10 pt-3">
                  <Button
                    type="button"
                    disabled
                    className="h-10 w-full rounded-xl border border-emerald-400/35 bg-gradient-to-r from-emerald-500/22 via-emerald-500/16 to-cyan-500/14 text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Use this account
                  </Button>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled
                      className="h-7 gap-1.5 rounded-lg text-xs text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <SquareTerminal className="h-3 w-3" />
                      Terminal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled
                      className="h-7 gap-1.5 rounded-lg text-xs text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Details
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled
                      className="h-7 gap-1.5 rounded-lg text-xs text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Sessions
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled
                      className="h-7 gap-1.5 rounded-lg text-xs text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled
                    className="mt-2 h-7 rounded-md border-cyan-500/35 bg-cyan-500/10 px-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    DEBUG
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Enter email address"
            aria-label="Email address"
            className="sm:flex-1"
          />
          <Button type="submit" className="sm:min-w-28">
            Submit
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href="/dashboard">Open dashboard</a>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href="/accounts">Open accounts</a>
          </Button>
        </div>

        {submittedEmail ? (
          <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">
            Thanks! We will keep <span className="font-medium">{submittedEmail}</span>{" "}
            posted.
          </p>
        ) : null}
      </section>
    </main>
  );
}
