import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountSnapshotTutorial } from "@/features/accounts/components/account-snapshot-tutorial";

describe("AccountSnapshotTutorial", () => {
  it("shows terminal steps for creating a codex-auth snapshot", () => {
    render(<AccountSnapshotTutorial />);

    expect(screen.getByText("No codex-auth snapshot is linked to this account yet.")).toBeInTheDocument();
    expect(screen.getByText("codex login")).toBeInTheDocument();
    expect(screen.getByText("codex-auth save <snapshot-name>")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy commands" })).toBeInTheDocument();
  });
});
