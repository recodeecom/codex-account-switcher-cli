import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { renderWithProviders } from "@/test/utils";

describe("storage flow integration", () => {
  it("loads storage page and renders coming soon copy", async () => {
    window.history.pushState({}, "", "/storage");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Storage" })).toBeInTheDocument();
    expect(screen.getByText("What the dashboard currently does")).toBeInTheDocument();
    expect(screen.getByText("Why this improves daily work")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("navigates to storage from header tab", async () => {
    const user = userEvent.setup({ delay: null });

    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Storage/i }));
    expect(await screen.findByRole("heading", { name: "Storage" })).toBeInTheDocument();
  });
});
