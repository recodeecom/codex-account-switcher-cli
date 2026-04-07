import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RoutingSettings } from "@/features/settings/components/routing-settings";
import type { DashboardSettings } from "@/features/settings/schemas";

const BASE_SETTINGS: DashboardSettings = {
  stickyThreadsEnabled: false,
  upstreamStreamTransport: "default",
  preferEarlierResetAccounts: true,
  routingStrategy: "usage_weighted",
  openaiCacheAffinityMaxAgeSeconds: 300,
  stickyReallocationBudgetThresholdPct: 95,
  importWithoutOverwrite: false,
  totpRequiredOnLogin: false,
  totpConfigured: false,
  apiKeyAuthEnabled: true,
};

describe("RoutingSettings", () => {
  it("saves a new prompt-cache affinity ttl from the button and Enter key", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <RoutingSettings settings={BASE_SETTINGS} busy={false} onSave={onSave} />,
    );

    const ttlInput = screen.getByRole("spinbutton", { name: "Prompt-cache affinity TTL seconds" });
    await user.clear(ttlInput);
    await user.type(ttlInput, "180");
    await user.click(screen.getByRole("button", { name: "Save TTL" }));

    expect(onSave).toHaveBeenCalledWith({
      stickyThreadsEnabled: false,
      upstreamStreamTransport: "default",
      preferEarlierResetAccounts: true,
      routingStrategy: "usage_weighted",
      openaiCacheAffinityMaxAgeSeconds: 180,
      stickyReallocationBudgetThresholdPct: 95,
      importWithoutOverwrite: false,
      totpRequiredOnLogin: false,
      apiKeyAuthEnabled: true,
    });

    rerender(
      <RoutingSettings
        settings={{ ...BASE_SETTINGS, openaiCacheAffinityMaxAgeSeconds: 180 }}
        busy={false}
        onSave={onSave}
      />,
    );

    await user.clear(screen.getByRole("spinbutton", { name: "Prompt-cache affinity TTL seconds" }));
    await user.type(screen.getByRole("spinbutton", { name: "Prompt-cache affinity TTL seconds" }), "240{Enter}");

    expect(onSave).toHaveBeenLastCalledWith({
      stickyThreadsEnabled: false,
      upstreamStreamTransport: "default",
      preferEarlierResetAccounts: true,
      routingStrategy: "usage_weighted",
      openaiCacheAffinityMaxAgeSeconds: 240,
      stickyReallocationBudgetThresholdPct: 95,
      importWithoutOverwrite: false,
      totpRequiredOnLogin: false,
      apiKeyAuthEnabled: true,
    });
  });

  it("disables ttl save for invalid values and saves sticky-thread toggles", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoutingSettings settings={BASE_SETTINGS} busy={false} onSave={onSave} />);

    const ttlInput = screen.getByRole("spinbutton", { name: "Prompt-cache affinity TTL seconds" });
    const saveButton = screen.getByRole("button", { name: "Save TTL" });
    expect(saveButton).toBeDisabled();

    await user.clear(ttlInput);
    await user.type(ttlInput, "0");
    expect(saveButton).toBeDisabled();

    await user.click(screen.getAllByRole("switch")[0]!);

    expect(onSave).toHaveBeenCalledWith({
      stickyThreadsEnabled: true,
      upstreamStreamTransport: "default",
      preferEarlierResetAccounts: true,
      routingStrategy: "usage_weighted",
      openaiCacheAffinityMaxAgeSeconds: 300,
      stickyReallocationBudgetThresholdPct: 95,
      importWithoutOverwrite: false,
      totpRequiredOnLogin: false,
      apiKeyAuthEnabled: true,
    });
  });

  it("saves low-budget switch threshold from button and Enter key", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <RoutingSettings settings={BASE_SETTINGS} busy={false} onSave={onSave} />,
    );

    const thresholdInput = screen.getByRole("spinbutton", { name: "Low-budget switch threshold percent" });
    await user.clear(thresholdInput);
    await user.type(thresholdInput, "85.5");
    await user.click(screen.getByRole("button", { name: "Save Threshold" }));

    expect(onSave).toHaveBeenCalledWith({
      stickyThreadsEnabled: false,
      upstreamStreamTransport: "default",
      preferEarlierResetAccounts: true,
      routingStrategy: "usage_weighted",
      openaiCacheAffinityMaxAgeSeconds: 300,
      stickyReallocationBudgetThresholdPct: 85.5,
      importWithoutOverwrite: false,
      totpRequiredOnLogin: false,
      apiKeyAuthEnabled: true,
    });

    rerender(
      <RoutingSettings
        settings={{ ...BASE_SETTINGS, stickyReallocationBudgetThresholdPct: 85.5 }}
        busy={false}
        onSave={onSave}
      />,
    );

    await user.clear(screen.getByRole("spinbutton", { name: "Low-budget switch threshold percent" }));
    await user.type(screen.getByRole("spinbutton", { name: "Low-budget switch threshold percent" }), "70{Enter}");

    expect(onSave).toHaveBeenLastCalledWith({
      stickyThreadsEnabled: false,
      upstreamStreamTransport: "default",
      preferEarlierResetAccounts: true,
      routingStrategy: "usage_weighted",
      openaiCacheAffinityMaxAgeSeconds: 300,
      stickyReallocationBudgetThresholdPct: 70,
      importWithoutOverwrite: false,
      totpRequiredOnLogin: false,
      apiKeyAuthEnabled: true,
    });
  });

  it("shows the configured upstream transport", () => {
    render(<RoutingSettings settings={BASE_SETTINGS} busy={false} onSave={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText("Upstream stream transport")).toBeInTheDocument();
    expect(screen.getByText("Server default")).toBeInTheDocument();
  });
});
