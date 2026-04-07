import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import App from "@/App";
import { renderWithProviders } from "@/test/utils";

describe("devices flow integration", () => {
  it("loads devices page and supports add/edit/delete", async () => {
    const user = userEvent.setup({ delay: null });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    window.history.pushState({}, "", "/devices");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Devices" })).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Device name (e.g. ksskringdistance03)"),
      "ksskringdistance03",
    );
    await user.type(screen.getByPlaceholderText("IP address (e.g. 192.168.0.1)"), "192.168.0.1");

    await user.click(screen.getByRole("button", { name: "Add device" }));
    expect(await screen.findByText("ksskringdistance03")).toBeInTheDocument();
    expect(screen.getByText("192.168.0.1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Edit device name for ksskringdistance03"));
    await user.type(screen.getByLabelText("Edit device name for ksskringdistance03"), "ksskringdistance04");
    await user.clear(screen.getByLabelText("Edit IP address for ksskringdistance03"));
    await user.type(screen.getByLabelText("Edit IP address for ksskringdistance03"), "192.168.0.2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("ksskringdistance04")).toBeInTheDocument();
    expect(screen.getByText("192.168.0.2")).toBeInTheDocument();
    expect(screen.queryByText("ksskringdistance03")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide sensitive values" }));
    expect(screen.getByText("ksskringdistance04")).toHaveClass("privacy-blur");
    expect(screen.getByText("192.168.0.2")).toHaveClass("privacy-blur");

    await user.click(screen.getByRole("button", { name: "Copy ksskringdistance04 and 192.168.0.2" }));
    expect(writeText).toHaveBeenCalledWith("ksskringdistance04\t192.168.0.2");

    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("ksskringdistance04")).not.toBeInTheDocument();
    });
  });

  it("keeps row unchanged when inline edit is canceled", async () => {
    const user = userEvent.setup({ delay: null });

    window.history.pushState({}, "", "/devices");
    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Devices" })).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Device name (e.g. ksskringdistance03)"),
      "cancel-test-device",
    );
    await user.type(screen.getByPlaceholderText("IP address (e.g. 192.168.0.1)"), "10.10.10.10");
    await user.click(screen.getByRole("button", { name: "Add device" }));
    expect(await screen.findByText("cancel-test-device")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Edit device name for cancel-test-device"));
    await user.type(screen.getByLabelText("Edit device name for cancel-test-device"), "should-not-save");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("cancel-test-device")).toBeInTheDocument();
    expect(screen.getByText("10.10.10.10")).toBeInTheDocument();
    expect(screen.queryByText("should-not-save")).not.toBeInTheDocument();
  });
});
