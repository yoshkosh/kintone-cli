import { Command } from "commander";
import { kintoneRequest } from "../../client.js";
import { attachEndpoint } from "../../schema-option.js";
import { validateJsonOrThrow } from "../../validator.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
  requireOpts,
  parseJsonOption,
} from "../shared.js";

export const registerAppDeployCommands = ({ previewApp }: { previewApp: Command }): void => {
  const deploy = previewApp
    .command("deploy")
    .description("App deploy operations (/k/v1/preview/app/deploy)");

  // GET /k/v1/preview/app/deploy.json
  const deployGet = deploy
    .command("get")
    .description("Get deploy status of apps")
    .option("--apps <ids>", "Comma-separated App IDs")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["apps"]);
      const global = getGlobalOptions(cmd);
      const apps = opts.apps.split(",").map(Number);

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/preview/app/deploy.json",
        params: { apps },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(deployGet, {
    method: "GET",
    path: "/k/v1/preview/app/deploy.json",
  });

  // POST /k/v1/preview/app/deploy.json
  const deployAdd = deploy
    .command("add")
    .description("Deploy app settings to live")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/preview/app/deploy.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/preview/app/deploy.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(deployAdd, {
    method: "POST",
    path: "/k/v1/preview/app/deploy.json",
  });
};
