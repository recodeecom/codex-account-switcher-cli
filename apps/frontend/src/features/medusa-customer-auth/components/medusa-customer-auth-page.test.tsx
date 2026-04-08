import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MedusaCustomerAuthPage } from "@/features/medusa-customer-auth/components/medusa-customer-auth-page";
import { useMedusaCustomerAuthStore } from "@/features/medusa-customer-auth/hooks/use-medusa-customer-auth";

function setAuthState(
  patch: Partial<ReturnType<typeof useMedusaCustomerAuthStore.getState>>,
): void {
  useMedusaCustomerAuthStore.setState({
    token: null,
    customer: null,
    initialized: true,
    loading: false,
    error: null,
    initialize: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    clearError: vi.fn(),
    ...patch,
  });
}

describe("MedusaCustomerAuthPage", () => {
  beforeEach(() => {
    setAuthState({});
  });

  it("renders the auth shell without decorative logo or card backgrounds", () => {
    render(<MedusaCustomerAuthPage />);

    expect(screen.getByTestId("medusa-auth-logo-shell")).not.toHaveClass("bg-gradient-to-br");
    expect(screen.getByTestId("medusa-auth-logo-shell")).not.toHaveClass("border");
    expect(screen.getByTestId("medusa-auth-surface")).not.toHaveClass("bg-card");
    expect(screen.getByTestId("medusa-auth-surface")).not.toHaveClass("border");
  });

  it("renders login and register as flat inline tabs", async () => {
    const user = userEvent.setup();
    render(<MedusaCustomerAuthPage />);

    const tabs = screen.getByTestId("medusa-auth-tabs");
    expect(tabs).not.toHaveClass("bg-muted");

    await user.click(screen.getByRole("tab", { name: "Register" }));
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
  });
});
