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
    expect(
      screen.getByText("Secure storage for devices and API environment values is coming soon."),
    ).toBeInTheDocument();
    expect(screen.getByText("Storage is coming soon")).toBeInTheDocument();
  });

  it("navigates to storage from header tab", async () => {
    const user = userEvent.setup({ delay: null });

    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Storage (coming soon)" }));
    expect(await screen.findByRole("heading", { name: "Storage" })).toBeInTheDocument();
  });
});
