import { BaseCommand } from "../lib/base-command";

export default class ListCommand extends BaseCommand {
  static description = "List accounts managed under ~/.codex";

  async run(): Promise<void> {
    await this.runSafe(async () => {
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
    });
  }
}
