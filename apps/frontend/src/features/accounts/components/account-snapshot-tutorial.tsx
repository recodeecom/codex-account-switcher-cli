import { AlertMessage } from "@/components/alert-message";
import { CopyButton } from "@/components/copy-button";

const SNAPSHOT_TUTORIAL_COMMANDS = ["codex login", "codex-auth save <snapshot-name>"].join("\n");

export function AccountSnapshotTutorial() {
  return (
    <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <AlertMessage variant="error">
        No codex-auth snapshot is linked to this account yet.
      </AlertMessage>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>
          Save a snapshot from your terminal first, then click <strong>Use this</strong> again.
        </p>
        <ol className="list-inside list-decimal space-y-1">
          <li>
            Log in with the target account:
            {" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">codex login</code>
          </li>
          <li>
            Save the login as a named snapshot:
            {" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">codex-auth save &lt;snapshot-name&gt;</code>
          </li>
        </ol>
      </div>
      <div className="space-y-2">
        <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs text-foreground">
          <code>{SNAPSHOT_TUTORIAL_COMMANDS}</code>
        </pre>
        <CopyButton value={SNAPSHOT_TUTORIAL_COMMANDS} label="Copy commands" />
      </div>
    </div>
  );
}
