import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { AccountMenu } from "@/components/layout/account-menu";
import { useMedusaAdminAuthStore } from "@/features/medusa-auth/hooks/use-medusa-admin-auth";
import { renderWithProviders } from "@/test/utils";

describe("AccountMenu component", () => {
  beforeEach(() => {
    useMedusaAdminAuthStore.setState({
      token: null,
      user: null,
      lastLoginCredentials: null,
      loading: false,
      error: null,
      login: async () => undefined,
      logout: () => undefined,
      clearError: () => undefined,
    });
  });

  it("shows Medusa sign-in state when no admin session exists", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<AccountMenu onLogout={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.getByRole("menuitem", { name: "Sign in Medusa admin" })).toBeInTheDocument();
    expect(screen.getByText("Not signed in")).toBeInTheDocument();
    expect(screen.getByText("No Medusa credentials used yet")).toBeInTheDocument();
  });

  it("shows the last Medusa credentials used for login", async () => {
    const user = userEvent.setup({ delay: null });

    useMedusaAdminAuthStore.setState({
      token: "jwt-token",
      user: {
        id: "user_123",
        email: "admin@example.com",
        first_name: "Admin",
        last_name: "User",
        avatar_url: null,
      },
      lastLoginCredentials: {
        email: "odin@recodee.com",
        password: "medusa-secret",
      },
    });

    renderWithProviders(<AccountMenu onLogout={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.getByRole("menuitem", { name: "Sign out Medusa admin" })).toBeInTheDocument();
    expect(screen.getByText("odin@recodee.com")).toBeInTheDocument();
    expect(screen.getByText("medusa-secret")).toBeInTheDocument();
  });
});
