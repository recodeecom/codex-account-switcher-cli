import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/utils";

import { SourceControlPage } from "./source-control-page";

describe("SourceControlPage", () => {
  it("renders branch-focused source control preview with PR actions", async () => {
    renderWithProviders(<SourceControlPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Source Control" })).toBeInTheDocument();
      expect(screen.getByText("Current codex branches")).toBeInTheDocument();
      expect(screen.getByText("Current GX bot statuses")).toBeInTheDocument();
      expect(screen.getByText("Pull request status")).toBeInTheDocument();
    });

    expect(screen.getByText("Master Agent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Merge PR (gh)" })).toBeInTheDocument();
  });
});
