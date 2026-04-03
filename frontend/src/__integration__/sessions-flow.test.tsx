import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils";

describe("sessions flow integration", () => {
  it("loads sessions page and renders codex sessions grouped by account", async () => {
    server.use(
      http.get("/api/sticky-sessions", ({ request }) => {
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
  });

  it("navigates to sessions from header tab", async () => {
    const user = userEvent.setup({ delay: null });

    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Sessions" }));
    expect(await screen.findByRole("heading", { name: "Sessions" })).toBeInTheDocument();
  });
});
