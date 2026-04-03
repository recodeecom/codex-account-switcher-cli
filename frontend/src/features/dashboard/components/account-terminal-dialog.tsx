import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import * as XtermModule from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AccountSummary } from "@/features/dashboard/schemas";
import {
  resolveTerminalConstructor,
  type XtermTerminalInstance,
} from "@/features/dashboard/components/terminal-constructor";
import { useThemeStore } from "@/hooks/use-theme";

type TerminalDialogProps = {
  open: boolean;
  account: AccountSummary | null;
  onOpenChange: (open: boolean) => void;
};

function buildTerminalSocketUrl(accountId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/api/accounts/${encodeURIComponent(accountId)}/terminal/ws`;
}

function toTerminalTheme(isDark: boolean) {
  if (isDark) {
    return {
      background: "#090d1a",
      foreground: "#e5e7eb",
      cursor: "#22d3ee",
      cursorAccent: "#090d1a",
      selectionBackground: "rgba(34, 211, 238, 0.25)",
    };
  }

  return {
    background: "#f8fafc",
    foreground: "#0f172a",
    cursor: "#0369a1",
    cursorAccent: "#f8fafc",
    selectionBackground: "rgba(3, 105, 161, 0.20)",
  };
}

export function AccountTerminalDialog({ open, account, onOpenChange }: TerminalDialogProps) {
  const terminalHostElementRef = useRef<HTMLDivElement | null>(null);
  const [hostVersion, setHostVersion] = useState(0);
  const handleTerminalHostRef = useCallback((node: HTMLDivElement | null) => {
    terminalHostElementRef.current = node;
    setHostVersion((value) => value + 1);
  }, []);
  const isDark = useThemeStore((s) => s.theme === "dark");
  const theme = useMemo(() => toTerminalTheme(isDark), [isDark]);

  useEffect(() => {
    const hostElement = terminalHostElementRef.current;
    if (!open || !account || !hostElement) {
      return;
    }
    hostElement.innerHTML = "";
    const renderInitError = (message: string) => {
      hostElement.innerHTML = "";
      const notice = document.createElement("p");
      notice.role = "status";
      notice.className = "px-4 py-3 text-sm text-rose-300";
      notice.textContent = message;
      hostElement.appendChild(notice);
    };

    const TerminalConstructor = resolveTerminalConstructor(XtermModule);
    if (!TerminalConstructor) {
      renderInitError("Terminal runtime failed to load. Refresh and try again.");
      return;
    }

    let terminal: XtermTerminalInstance;
    try {
      terminal = new TerminalConstructor({
        allowTransparency: false,
        convertEol: true,
        cursorBlink: true,
        cursorStyle: "block",
        cols: 120,
        rows: 36,
        fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 13,
        lineHeight: 1.28,
        scrollback: 10_000,
        theme,
      });
    } catch {
      renderInitError("Terminal failed to initialize. Please reopen the dialog.");
      return;
    }

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(hostElement);
    const runFit = () => {
      fitAddon.fit();
    };
    runFit();
    const initialFitRaf = window.requestAnimationFrame(runFit);
    const initialFitTimeout = window.setTimeout(runFit, 120);
    terminal.focus();
    terminal.writeln(`Connecting terminal for ${account.email}...`);

    const socket = new WebSocket(buildTerminalSocketUrl(account.accountId));

    const sendResize = () => {
      fitAddon.fit();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "resize",
            cols: terminal.cols,
            rows: terminal.rows,
          }),
        );
      }
    };

    const dataDisposable = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "input", data }));
      }
    });

    socket.onopen = () => {
      sendResize();
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as
          | { type: "output"; data: string }
          | { type: "ready"; snapshotName: string }
          | { type: "error"; message: string }
          | { type: "exit"; code: number };

        if (message.type === "output") {
          terminal.write(message.data);
          return;
        }

        if (message.type === "ready") {
          terminal.writeln(`\r\n[connected] snapshot: ${message.snapshotName}\r\n`);
          return;
        }

        if (message.type === "error") {
          terminal.writeln(`\r\n[error] ${message.message}\r\n`);
          return;
        }

        if (message.type === "exit") {
          terminal.writeln(`\r\n[session exited] code ${message.code}\r\n`);
        }
      } catch {
        terminal.write(String(event.data));
      }
    };

    socket.onerror = () => {
      terminal.writeln("\r\n[error] Terminal connection failed.\r\n");
    };

    socket.onclose = () => {
      terminal.writeln("\r\n[disconnected]\r\n");
    };

    const observer = new ResizeObserver(() => {
      sendResize();
    });
    observer.observe(hostElement);
    window.addEventListener("resize", sendResize);

    return () => {
      window.removeEventListener("resize", sendResize);
      observer.disconnect();
      window.cancelAnimationFrame(initialFitRaf);
      window.clearTimeout(initialFitTimeout);
      dataDisposable.dispose();
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "dialog_closed");
      } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      terminal.dispose();
      hostElement.innerHTML = "";
    };
  }, [account, hostVersion, open, theme]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Codex Terminal</DialogTitle>
          <DialogDescription>
            {account ? `Account: ${account.email}` : "No account selected"}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-b-xl bg-[#090d1a] px-2 py-2 dark:bg-[#090d1a]">
          <div ref={handleTerminalHostRef} className="h-[65vh] w-full overflow-hidden rounded-lg border border-cyan-500/20" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
