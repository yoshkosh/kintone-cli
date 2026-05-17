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

export const registerAppCommands = ({
  program,
  previewApp,
}: {
  program: Command;
  previewApp: Command;
}): { app: Command } => {
  const app = program.command("app").description("App operations (/k/v1/app)");

  // GET /k/v1/app.json — query: id(必須), lang
  const appGet = app
    .command("get")
    .description("Get app info")
    .option("--id <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["id"]);
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = { id: opts.id };
      if (opts.lang) params.lang = opts.lang;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/app.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(appGet, { method: "GET", path: "/k/v1/app.json" });

  // POST /k/v1/preview/app.json — pre-live でアプリを新規作成
  const previewAppAdd = previewApp
    .command("add")
    .description("Create a new app")
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
          path: "/k/v1/preview/app.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/preview/app.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(previewAppAdd, {
    method: "POST",
    path: "/k/v1/preview/app.json",
  });

  return { app };
};
