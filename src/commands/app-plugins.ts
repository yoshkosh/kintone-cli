import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
} from "./shared.js";

export const registerAppPluginsCommands = ({
  app,
  previewApp,
}: {
  app: Command;
  previewApp: Command;
}): void => {
  // --- app plugins (live GET) ---
  const appPlugins = app.command("plugins").description("App plugins");

  // GET /k/v1/app/plugins.json
  appPlugins
    .command("get")
    .description("Get app plugins")
    .requiredOption("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = { app: opts.app };
      if (opts.lang) params.lang = opts.lang;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/app/plugins.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });

  // --- preview app plugins (GET + POST) ---
  const previewPlugins = previewApp
    .command("plugins")
    .description("Preview app plugins");

  // GET /k/v1/preview/app/plugins.json
  previewPlugins
    .command("get")
    .description("Get app plugins (pre-live)")
    .requiredOption("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = { app: opts.app };
      if (opts.lang) params.lang = opts.lang;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/preview/app/plugins.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });

  // POST /k/v1/preview/app/plugins.json
  previewPlugins
    .command("add")
    .description("Add plugins to app (pre-live)")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/preview/app/plugins.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/preview/app/plugins.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });

  // --- app move ---
  const appMove = app.command("move").description("Move app to another space");

  // POST /k/v1/app/move.json
  appMove
    .command("add")
    .description("Move app to another space")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/app/move.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/app/move.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
};
