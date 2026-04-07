import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ComingSoonPage } from "@/features/coming-soon/components/coming-soon-page";

describe("ComingSoonPage", () => {
  it("renders full-width layout with left preview and right content", () => {
    render(<ComingSoonPage />);

    expect(screen.getAllByText("recodee.com").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Coming Soon" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "What the dashboard currently does",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("May your tokens last forever.")).toBeInTheDocument();
    expect(
      screen.getByText("A dashboard that helps them go a lot further."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Please enter your email address").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Waiting for email address")).not.toBeInTheDocument();
    expect(screen.queryByText("working...")).not.toBeInTheDocument();
    expect(screen.getByText("Team · demo@demo.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit account tutorial" }),
    ).toBeDisabled();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit account tutorial" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open dashboard" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Open accounts" })).toHaveAttribute(
      "href",
      "/accounts",
    );
    expect(screen.getAllByText("TECH STACK").length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: "Onlook" })
        .some(
          (link) =>
            link.getAttribute("href") === "https://github.com/onlook-dev/onlook",
        ),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "OpenRouter" })
        .some((link) => link.getAttribute("href") === "https://openrouter.ai"),
    ).toBe(true);
    expect(screen.getByText("Fun Fact")).toBeInTheDocument();
    expect(
      screen.getByText("We built recodee with recodee. We call that confidence."),
    ).toBeInTheDocument();
    expect(screen.getByText("codex tokens used: 3B")).toBeInTheDocument();
    expect(screen.getByText("money saved: $10k+")).toBeInTheDocument();
    expect(screen.getByAltText("Dashboard preview")).toBeInTheDocument();
  });

  it("keeps only the in-card agent email field", () => {
    render(<ComingSoonPage />);
    expect(screen.getByLabelText("Agent email address")).toBeInTheDocument();
    expect(screen.queryByText(/Thanks! We will keep/i)).not.toBeInTheDocument();
  });

  it("enables account activation controls once agent email is entered", async () => {
    const user = userEvent.setup();
    render(<ComingSoonPage />);

    await user.type(
      screen.getByLabelText("Agent email address"),
      "demo@demo.com",
    );

    expect(
      screen.getByRole("button", { name: "Submit account tutorial" }),
    ).toBeEnabled();
    expect(screen.queryByText("thinking")).not.toBeInTheDocument();
  });
});
