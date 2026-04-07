import { Flags } from "@oclif/core";
import { spawn } from "node:child_process";
import prompts from "prompts";
import { BaseCommand } from "../lib/base-command";
import { fetchLatestNpmVersion, isVersionNewer } from "../lib/update-check";

const PACKAGE_NAME = "@imdeadpool/codex-account-switcher";

export default class ListCommand extends BaseCommand {
  static description = "List accounts managed under ~/.codex";

  static flags = {
    details: Flags.boolean({
      char: "d",
      description: "Show per-account mapping metadata (email/account/user/usage)",
      default: false,
    }),
  } as const;

  async run(): Promise<void> {
    await this.runSafe(async () => {
      const { flags } = await this.parse(ListCommand);
      const detailed = Boolean(flags.details);
      await this.maybeOfferGlobalUpdate();

      if (!detailed) {
        const accounts = await this.accounts.listAccountNames();
        const current = await this.accounts.getCurrentAccountName();
        if (!accounts.length) {
          this.log("No saved Codex accounts yet. Run `codex-auth save <name>`.");
          return;
        }

        for (const name of accounts) {
          const mark = current === name ? "*" : " ";
          this.log(`${mark} ${name}`);
        }
        return;
      }

      const accounts = await this.accounts.listAccountMappings();
      if (!accounts.length) {
        this.log("No saved Codex accounts yet. Run `codex-auth save <name>`.");
        return;
      }

      for (const account of accounts) {
        const mark = account.active ? "*" : " ";
        this.log(`${mark} ${account.name}`);
        this.log(
          `    email=${account.email ?? "-"} account=${account.accountId ?? "-"} user=${account.userId ?? "-"}`,
        );
        this.log(
          `    plan=${account.planType ?? "-"} usage=${account.usageSource ?? "-"} lastUsageAt=${account.lastUsageAt ?? "-"}`,
        );
      }
    });
  }

  private async maybeOfferGlobalUpdate(): Promise<void> {
    if (!process.stdin.isTTY || !process.stdout.isTTY) return;

    const currentVersion = this.config.version;
    if (!currentVersion || typeof currentVersion !== "string") return;

    const latestVersion = await fetchLatestNpmVersion(PACKAGE_NAME);
    if (!latestVersion || !isVersionNewer(currentVersion, latestVersion)) return;

    this.log(`Update available for codex-auth: ${currentVersion} -> ${latestVersion}`);

    const prompt = await prompts({
      type: "confirm",
      name: "install",
      message: "Press Enter to update globally now",
      initial: true,
    });

    if (!prompt.install) {
      this.log(`Skipped update. Run manually: npm i -g ${PACKAGE_NAME}@latest`);
      return;
    }

    const installExitCode = await this.runGlobalInstall();
    if (installExitCode === 0) {
      this.log("Global update completed.");
      return;
    }

    this.warn(`Global update failed (exit code ${installExitCode}). Try: npm i -g ${PACKAGE_NAME}@latest`);
  }

  private async runGlobalInstall(): Promise<number> {
    return new Promise((resolve) => {
      const child = spawn("npm", ["i", "-g", `${PACKAGE_NAME}@latest`], {
        stdio: "inherit",
      });

      child.on("error", () => {
        resolve(1);
      });

      child.on("exit", (code) => {
        resolve(typeof code === "number" ? code : 1);
      });
    });
  }
}
