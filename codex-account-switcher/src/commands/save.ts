import { Args } from "@oclif/core";
import { BaseCommand } from "../lib/base-command";

export default class SaveCommand extends BaseCommand {
  static description = "Save the current ~/.codex/auth.json as a named account";

  static args = {
    name: Args.string({
      name: "name",
      required: true,
      description: "Name for the account snapshot",
    }),
  } as const;

  async run(): Promise<void> {
    await this.runSafe(async () => {
      const { args } = await this.parse(SaveCommand);
      const savedName = await this.accounts.saveAccount(args.name as string);
      this.log(`Saved current Codex auth tokens as "${savedName}".`);
    });
  }
}
