import { Args, Flags } from "@oclif/core";
import { spawn } from "node:child_process";
import { BaseCommand } from "../lib/base-command";
import { CodexAuthError } from "../lib/accounts";

export default class LoginCommand extends BaseCommand {
  static description =
    "Run `codex login` and save the resulting ~/.codex/auth.json as a named account";

  static args = {
    name: Args.string({
      name: "name",
      required: true,
      description: "Name for the account snapshot to save after login",
    }),
  } as const;

  static flags = {
    "device-auth": Flags.boolean({
      description: "Pass through to `codex login --device-auth`",
      default: false,
    }),
  } as const;

  async run(): Promise<void> {
    await this.runSafe(async () => {
      const { args, flags } = await this.parse(LoginCommand);
      const name = args.name as string;

      await this.runCodexLogin(Boolean(flags["device-auth"]));

      const savedName = await this.accounts.saveAccount(name);
      this.log(`Saved current Codex auth tokens as "${savedName}".`);
    });
  }

  private async runCodexLogin(deviceAuth: boolean): Promise<void> {
    const loginArgs = deviceAuth ? ["login", "--device-auth"] : ["login"];

    await new Promise<void>((resolve, reject) => {
      const child = spawn("codex", loginArgs, {
        stdio: "inherit",
      });

      child.on("error", (error) => {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          reject(
            new CodexAuthError(
              "`codex` CLI was not found in PATH. Install Codex CLI first, then retry.",
            ),
          );
          return;
        }
        reject(error);
      });

      child.on("exit", (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }

        if (typeof code === "number") {
          reject(new CodexAuthError(`\`codex ${loginArgs.join(" ")}\` failed with exit code ${code}.`));
          return;
        }

        reject(new CodexAuthError(`\`codex ${loginArgs.join(" ")}\` was terminated by signal ${signal ?? "unknown"}.`));
      });
    });
  }
}
