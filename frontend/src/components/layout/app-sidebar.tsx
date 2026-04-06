import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Check,
  ChevronsUpDown,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Link2,
  MonitorSmartphone,
  Settings2,
  Users,
} from "lucide-react";
import { NavLink } from "@/lib/router-compat";

import { CodexLogo } from "@/components/brand/codex-logo";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/accounts": Users,
  "/apis": KeyRound,
  "/devices": MonitorSmartphone,
  "/storage": HardDrive,
  "/sessions": Link2,
  "/settings": Settings2,
};

export function AppSidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,10,18,0.97)_0%,rgba(3,5,12,1)_100%)] text-slate-100 lg:block">
      <div className="sticky top-0 flex h-screen flex-col gap-7 px-4 pt-5 pb-20">
        <details className="group">
          <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 transition-colors group-open:bg-white/[0.05]">
              <div className="flex h-11 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/45 via-primary/30 to-primary/5 text-white">
                <CodexLogo size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-white">
                  Codexina
                </p>
                <p className="truncate text-xs text-slate-400">Account switchboard</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-slate-400 transition-colors group-open:text-slate-200" aria-hidden="true" />
            </div>
          </summary>

          <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.08] bg-black/25">
            <p className="px-3 pt-3 pb-1 text-xs text-slate-400">Switchboards</p>
            <div className="px-2 pb-2">
              <div className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-2">
                <div className="flex h-10 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/45 via-primary/30 to-primary/5 text-white">
                  <CodexLogo size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">Codexina</p>
                  <p className="truncate text-xs text-slate-400">Account switchboard</p>
                </div>
                <Check className="h-4 w-4 text-slate-300" aria-hidden="true" />
              </div>
            </div>
          </div>
        </details>

        <nav aria-label="Sidebar" className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.to] ?? BarChart3;
            return (
              <NavLink key={item.to} to={item.to}>
                {({ isActive }) => (
                  <span
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {item.isComingSoon ? (
                      <Badge
                        variant="secondary"
                        className="border border-white/10 bg-white/5 px-1.5 py-0 text-[10px] text-slate-400"
                      >
                        Soon
                      </Badge>
                    ) : null}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
          <p className="text-xs text-slate-400">Monitoring your Codex sessions</p>
        </div>
      </div>
    </aside>
  );
}
