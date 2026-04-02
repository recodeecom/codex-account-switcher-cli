import os from "node:os";
import path from "node:path";

export const codexDir: string = path.join(os.homedir(), ".codex");
export const accountsDir: string = path.join(codexDir, "accounts");
export const authPath: string = path.join(codexDir, "auth.json");
export const currentNamePath: string = path.join(codexDir, "current");
