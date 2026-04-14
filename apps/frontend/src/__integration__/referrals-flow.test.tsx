import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { server } from "@/test/mocks/server";
import { renderWithProviders } from "@/test/utils";

describe("referrals page integration", () => {
  it("renders one invite link for the active account and shows empty referrals when no metadata exists", async () => {
    window.history.pushState({}, "", "/referrals");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Referrals" })).toBeInTheDocument();
    expect((await screen.findAllByText("primary@example.com")).length).toBeGreaterThan(0);
    expect(screen.getByText("Referred users")).toBeInTheDocument();
    expect(screen.getByText("No referred users yet.")).toBeInTheDocument();
    expect(screen.queryByText("secondary@example.com")).not.toBeInTheDocument();

    const referralLinks = screen.getAllByRole("link");
    expect(
      referralLinks.some((link) => link.getAttribute("href")?.includes("ref=acc_primary")),
    ).toBe(true);
    expect(
      referralLinks.some((link) => link.getAttribute("href")?.includes("ref=acc_secondary")),
    ).toBe(false);
    expect(screen.getAllByRole("button", { name: "Copy link" })).toHaveLength(1);
  });

  it("shows referred users from Medusa metadata instead of dashboard account list", async () => {
    server.use(
      http.get("*/store/customers/me", () =>
        HttpResponse.json({
          customer: {
            id: "cus_test_1",
            email: "customer@example.com",
            first_name: "Test",
            last_name: "Customer",
            phone: null,
            metadata: {
              referred_users_by_account_id: {
                acc_primary: ["invitee-one@example.com", "invitee-two@example.com"],
              },
            },
          },
        }),
      ),
    );

    window.history.pushState({}, "", "/referrals");
    renderWithProviders(<App />);

    expect(await screen.findByText("invitee-one@example.com")).toBeInTheDocument();
    expect(screen.getByText("invitee-two@example.com")).toBeInTheDocument();
    expect(screen.queryByText("secondary@example.com")).not.toBeInTheDocument();
  });
});
