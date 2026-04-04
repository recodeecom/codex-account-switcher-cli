import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { createAccountSummary, createDashboardOverview } from "@/test/mocks/factories";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils";

describe("sessions flow integration", () => {
  it("loads sessions page and renders codex sessions grouped by account", async () => {
    let requestUrl = "";
    server.use(
      http.get("/api/sticky-sessions", ({ request }) => {
        requestUrl = request.url;
        const url = new URL(request.url);
        if (url.searchParams.get("kind") !== "codex_session") {
          return HttpResponse.json({ entries: [], stalePromptCacheCount: 0, total: 0, hasMore: false });
        }
        return HttpResponse.json({
          entries: [
            {
              key: "session-alpha",
              accountId: "acc_alpha",
              displayName: "alpha@example.com",
              kind: "codex_session",
              createdAt: "2026-03-10T12:00:00Z",
              updatedAt: "2026-03-10T12:05:00Z",
              taskPreview: "Investigate alpha session stream retry bug",
              taskUpdatedAt: "2026-03-10T12:05:00Z",
              isActive: true,
              expiresAt: null,
              isStale: false,
            },
            {
              key: "session-beta",
              accountId: "acc_beta",
              displayName: "beta@example.com",
              kind: "codex_session",
              createdAt: "2026-03-10T13:00:00Z",
              updatedAt: "2026-03-10T13:02:00Z",
              taskPreview: "Review beta account quota depletion warnings",
              taskUpdatedAt: "2026-03-10T13:02:00Z",
              isActive: true,
              expiresAt: null,
              isStale: false,
            },
          ],
          stalePromptCacheCount: 0,
          total: 2,
          hasMore: false,
        });
      }),
    );

    window.history.pushState({}, "", "/sessions");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Sessions" })).toBeInTheDocument();
    expect(await screen.findByText("alpha@example.com")).toBeInTheDocument();
    expect(await screen.findByText("beta@example.com")).toBeInTheDocument();
    expect(screen.getByText("session-alpha")).toBeInTheDocument();
    expect(screen.getByText("session-beta")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Session / source" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Progress" })).toBeInTheDocument();
    expect(screen.getAllByText("Sticky mapping").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Live").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Up to date").length).toBeGreaterThan(0);
    expect(screen.getByText("Investigate alpha session stream retry bug")).toBeInTheDocument();
    expect(screen.getByText("Review beta account quota depletion warnings")).toBeInTheDocument();
    expect(requestUrl).toContain("activeOnly=true");
  });

  it("navigates to sessions from header tab", async () => {
    const user = userEvent.setup({ delay: null });

    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Sessions" }));
    expect(await screen.findByRole("heading", { name: "Sessions" })).toBeInTheDocument();
  });

  it("fallback mode renders account-level live status, task preview, and recency from overview telemetry", async () => {
    const now = Date.now();
    server.use(
      http.get("/api/sticky-sessions", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("kind") !== "codex_session") {
          return HttpResponse.json({ entries: [], stalePromptCacheCount: 0, total: 0, hasMore: false });
        }
        return HttpResponse.json({
          entries: [],
          stalePromptCacheCount: 0,
          total: 0,
          hasMore: false,
        });
      }),
      http.get("/api/dashboard/overview", () =>
        HttpResponse.json(
          createDashboardOverview({
            accounts: [
              createAccountSummary({
                accountId: "acc_zeus",
                email: "zeus@example.com",
                displayName: "zeus@example.com",
                codexLiveSessionCount: 0,
                codexTrackedSessionCount: 6,
                codexSessionCount: 0,
                codexCurrentTaskPreview: "Prepare release checklist for Zeus account",
                lastUsageRecordedAtPrimary: new Date(now - 30 * 60_000).toISOString(),
                lastUsageRecordedAtSecondary: new Date(now - 2 * 60 * 60_000).toISOString(),
                codexAuth: {
                  hasSnapshot: true,
                  snapshotName: "zeus",
                  activeSnapshotName: "zeus",
                  isActiveSnapshot: true,
                  hasLiveSession: false,
                },
              }),
            ],
          }),
        ),
      ),
    );

    window.history.pushState({}, "", "/sessions?accountId=acc_zeus");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Sessions" })).toBeInTheDocument();
    expect(await screen.findByText("Session activity")).toBeInTheDocument();
    expect(screen.getByText("zeus@example.com")).toBeInTheDocument();
    expect(screen.getByText("Dashboard overview")).toBeInTheDocument();
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("Prepare release checklist for Zeus account")).toBeInTheDocument();
    expect(screen.getByText(/last seen/i)).toBeInTheDocument();
    expect(screen.getAllByText("6").length).toBeGreaterThan(0);
  });

  it("fallback counters use tracked inventory while live badge follows live status", async () => {
    server.use(
      http.get("/api/sticky-sessions", () =>
        HttpResponse.json({
          entries: [],
          stalePromptCacheCount: 0,
          total: 0,
          hasMore: false,
        }),
      ),
      http.get("/api/dashboard/overview", () =>
        HttpResponse.json(
          createDashboardOverview({
            accounts: [
              createAccountSummary({
                accountId: "acc_runtime",
                email: "runtime@example.com",
                displayName: "runtime@example.com",
                codexLiveSessionCount: 0,
                codexTrackedSessionCount: 1,
                codexSessionCount: 0,
                codexAuth: {
                  hasSnapshot: true,
                  snapshotName: "runtime",
                  activeSnapshotName: "main",
                  isActiveSnapshot: false,
                  hasLiveSession: true,
                },
                lastUsageRecordedAtPrimary: new Date().toISOString(),
              }),
            ],
          }),
        ),
      ),
    );

    window.history.pushState({}, "", "/sessions?accountId=acc_runtime");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Sessions" })).toBeInTheDocument();
    expect(await screen.findByText("Session activity")).toBeInTheDocument();
    expect(screen.getByText("runtime@example.com")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Up to date")).toBeInTheDocument();
    expect(screen.getByText("1 tracked session")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("fallback mode handles missing task preview and usage timestamps with safe placeholders", async () => {
    server.use(
      http.get("/api/sticky-sessions", () =>
        HttpResponse.json({
          entries: [],
          stalePromptCacheCount: 0,
          total: 0,
          hasMore: false,
        }),
      ),
      http.get("/api/dashboard/overview", () =>
        HttpResponse.json(
          createDashboardOverview({
            accounts: [
              createAccountSummary({
                accountId: "acc_pending",
                email: "pending@example.com",
                displayName: "pending@example.com",
                codexLiveSessionCount: 0,
                codexTrackedSessionCount: 2,
                codexSessionCount: 0,
                codexCurrentTaskPreview: null,
                lastUsageRecordedAtPrimary: null,
                lastUsageRecordedAtSecondary: null,
                codexAuth: {
                  hasSnapshot: true,
                  snapshotName: "pending",
                  activeSnapshotName: "pending",
                  isActiveSnapshot: false,
                  hasLiveSession: false,
                },
              }),
            ],
          }),
        ),
      ),
    );

    window.history.pushState({}, "", "/sessions?accountId=acc_pending");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Sessions" })).toBeInTheDocument();
    expect(await screen.findByText("pending@example.com")).toBeInTheDocument();
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("telemetry pending")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
