import type { FitAddon } from "@xterm/addon-fit";

type Disposable = { dispose: () => void };

export type XtermTerminalTheme = {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
};

export type XtermTerminalInstance = {
  cols: number;
  rows: number;
  loadAddon: (addon: FitAddon) => void;
  open: (parent: HTMLElement) => void;
  focus: () => void;
  writeln: (data: string) => void;
  write: (data: string) => void;
  onData: (callback: (data: string) => void) => Disposable;
  dispose: () => void;
};

export type XtermTerminalConstructor = new (options: {
  allowTransparency: boolean;
  convertEol: boolean;
  cursorBlink: boolean;
  cursorStyle: "block";
  cols: number;
  rows: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  scrollback: number;
  theme: XtermTerminalTheme;
}) => XtermTerminalInstance;

export function resolveTerminalConstructor(
  moduleValue: unknown,
): XtermTerminalConstructor | null {
  const direct = moduleValue as { Terminal?: unknown; default?: unknown } | null;
  if (direct && typeof direct.Terminal === "function") {
    return direct.Terminal as XtermTerminalConstructor;
  }

  if (direct && direct.default && typeof direct.default === "object") {
    const nested = direct.default as { Terminal?: unknown };
    if (typeof nested.Terminal === "function") {
      return nested.Terminal as XtermTerminalConstructor;
    }
  }

  if (typeof moduleValue === "function") {
    return moduleValue as XtermTerminalConstructor;
  }

  return null;
}
