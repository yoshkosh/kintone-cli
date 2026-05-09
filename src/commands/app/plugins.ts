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
} from "../shared.js";

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
  const appPluginsGet = appPlugins
    .command("get")
    .description("Get app plugins")
    .option("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
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
  attachEndpoint(appPluginsGet, {
    method: "GET",
    path: "/k/v1/app/plugins.json",
  });

  // --- preview app plugins (GET + POST) ---
  const previewPlugins = previewApp.command("plugins").description("Preview app plugins");

  // GET /k/v1/preview/app/plugins.json
  const previewPluginsGet = previewPlugins
    .command("get")
    .description("Get app plugins (pre-live)")
    .option("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
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
  attachEndpoint(previewPluginsGet, {
    method: "GET",
    path: "/k/v1/preview/app/plugins.json",
  });

  // POST /k/v1/preview/app/plugins.json
  const previewPluginsAdd = previewPlugins
    .command("add")
    .description("Add plugins to app (pre-live)")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

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
  attachEndpoint(previewPluginsAdd, {
    method: "POST",
    path: "/k/v1/preview/app/plugins.json",
  });
};
