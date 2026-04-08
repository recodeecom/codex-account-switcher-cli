import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { renderWithProviders } from "@/test/utils";
import { server } from "@/test/mocks/server";

const STORAGE_KEY = "codex-lb-medusa-customer-token";

describe("auth flow integration", () => {
  it("logs in with Medusa credentials before entering dashboard", async () => {
    const user = userEvent.setup({ delay: null });

    window.localStorage.removeItem(STORAGE_KEY);

    server.use(
      http.post("*/auth/customer/emailpass", () =>
        HttpResponse.json({ token: "test-medusa-token" }),
      ),
      http.get("*/store/customers/me", () =>
        HttpResponse.json({
          customer: {
            id: "cus_test_1",
            email: "customer@example.com",
            first_name: "Test",
            last_name: "Customer",
            phone: null,
          },
        }),
      ),
    );

    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    expect(await screen.findByRole("tab", { name: "Login" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "supersecret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    });
  });

  it("shows an inline error when the Medusa backend is unreachable", async () => {
    const user = userEvent.setup({ delay: null });

    window.localStorage.removeItem(STORAGE_KEY);

    server.use(
      http.post("*/auth/customer/emailpass", () => HttpResponse.error()),
    );

    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    expect(await screen.findByRole("tab", { name: "Login" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "supersecret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText(/Unable to reach Medusa backend at .*Check NEXT_PUBLIC_MEDUSA_BACKEND_URL/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("registers a new Medusa customer account", async () => {
    const user = userEvent.setup({ delay: null });

    window.localStorage.removeItem(STORAGE_KEY);

    let customerEmail = "new.customer@example.com";

    server.use(
      http.post("*/auth/customer/emailpass/register", async ({ request }) => {
        const payload = (await request.json()) as { email?: string };
        customerEmail = payload.email ?? customerEmail;
        return HttpResponse.json({ token: "registration-token" });
      }),
      http.post("*/store/customers", async ({ request }) => {
        const payload = (await request.json()) as {
          email?: string;
          first_name?: string;
          last_name?: string;
        };
        customerEmail = payload.email ?? customerEmail;
        return HttpResponse.json({
          customer: {
            id: "cus_test_2",
            email: customerEmail,
            first_name: payload.first_name ?? null,
            last_name: payload.last_name ?? null,
            phone: null,
          },
        });
      }),
      http.post("*/auth/customer/emailpass", () =>
        HttpResponse.json({ token: "test-medusa-token" }),
      ),
      http.get("*/store/customers/me", () =>
        HttpResponse.json({
          customer: {
            id: "cus_test_2",
            email: customerEmail,
            first_name: "New",
            last_name: "Customer",
            phone: null,
          },
        }),
      ),
    );

    window.history.pushState({}, "", "/dashboard");
    renderWithProviders(<App />);

    await user.click(screen.getByRole("tab", { name: "Register" }));
    await user.type(screen.getByLabelText("First name"), "New");
    await user.type(screen.getByLabelText("Last name"), "Customer");
    await user.type(screen.getByLabelText("Email"), customerEmail);
    await user.type(screen.getByLabelText("Password"), "supersecret");
    await user.type(screen.getByLabelText("Confirm password"), "supersecret");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    });
  });
});
