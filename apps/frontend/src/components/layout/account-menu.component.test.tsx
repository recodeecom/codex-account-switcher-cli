import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountMenu } from "@/components/layout/account-menu";
import { useMedusaAdminAuthStore } from "@/features/medusa-auth/hooks/use-medusa-admin-auth";
import { renderWithProviders } from "@/test/utils";

describe("AccountMenu component", () => {
  beforeEach(() => {
    useMedusaAdminAuthStore.setState({
      token: null,
      user: null,
      loading: false,
      error: null,
      login: async () => undefined,
      logout: () => undefined,
      clearError: () => undefined,
    });
  });

  it("does not render a Medusa sign-in action in the menu", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<AccountMenu onLogout={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.queryByRole("menuitem", { name: "Sign in Medusa admin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Sign in Medusa storefront" })).not.toBeInTheDocument();
    expect(screen.getByText("Not signed in to storefront")).toBeInTheDocument();
  });

  it("shows storefront sign-out action when Medusa auth is already present", async () => {
    const user = userEvent.setup({ delay: null });
    const logout = vi.fn();

    useMedusaAdminAuthStore.setState({
      token: "jwt-token",
      user: {
        id: "cus_123",
        email: "customer@example.com",
        first_name: "Customer",
        last_name: "User",
        avatar_url: null,
      },
      logout,
    });

    renderWithProviders(<AccountMenu onLogout={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out Medusa storefront" }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
