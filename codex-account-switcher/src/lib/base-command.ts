import { Command } from "@oclif/core";
import { accountService, CodexAuthError } from "./accounts";

export abstract class BaseCommand extends Command {
  protected readonly accounts = accountService;

  protected async runSafe(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof CodexAuthError) {
      this.error(error.message);
    }

    throw error;
  }
}
