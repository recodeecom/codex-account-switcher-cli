import type { Hook } from "@oclif/core";
import {
  fetchLatestNpmVersion,
  formatUpdateSummaryInline,
  getUpdateSummary,
  PACKAGE_NAME,
} from "../../lib/update-check";

const hook: Hook.Init = async function (options) {
  if (options.id) return;
  if (options.argv.length > 0) return;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return;

  const currentVersion = options.config.version;
  if (!currentVersion) return;

  const latestVersion = await fetchLatestNpmVersion(PACKAGE_NAME);
  if (!latestVersion) return;
  const summary = getUpdateSummary(currentVersion, latestVersion);
  if (summary.state !== "update-available") return;

  this.log(formatUpdateSummaryInline(summary));
  this.log("Run `codex-auth self-update` to install the latest version.");
};

export default hook;
