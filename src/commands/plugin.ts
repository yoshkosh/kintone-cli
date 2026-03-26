import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import {
  getGlobalOptions,
  noGuestSpace,
  writeJson,
  dryRunOutput,
} from "./shared.js";

export const registerPluginCommands = (program: Command): void => {
  const plugin = program
    .command("plugin")
    .description("Plugin operations (/k/v1/plugin)");

  // POST /k/v1/plugin.json
  plugin
    .command("add")
    .description("Install a plugin")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugin add");
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({ method: "POST", path: "/k/v1/plugin.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/plugin.json",
        body,
        authType: global.authType,
      });
      writeJson(result);
    });

  // PUT /k/v1/plugin.json
  plugin
    .command("update")
    .description("Update a plugin")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugin update");
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({ method: "PUT", path: "/k/v1/plugin.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/plugin.json",
        body,
        authType: global.authType,
      });
      writeJson(result);
    });

  // DELETE /k/v1/plugin.json
  plugin
    .command("delete")
    .description("Uninstall a plugin")
    .requiredOption("--id <id>", "Plugin ID")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugin delete");
      const params = { id: opts.id };

      if (opts.dryRun) {
        dryRunOutput({ method: "DELETE", path: "/k/v1/plugin.json", params });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/plugin.json",
        params,
        authType: global.authType,
      });
      writeJson(result);
    });

  // --- plugin apps ---
  const pluginApps = plugin
    .command("apps")
    .description("Plugin app operations");

  // GET /k/v1/plugin/apps.json
  pluginApps
    .command("get")
    .description("Get apps using a plugin")
    .requiredOption("--id <id>", "Plugin ID")
    .option("--offset <n>", "Offset")
    .option("--limit <n>", "Limit")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugin apps get");
      const params: Record<string, unknown> = { id: opts.id };
      if (opts.offset) params.offset = opts.offset;
      if (opts.limit) params.limit = opts.limit;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/plugin/apps.json",
        params,
        authType: global.authType,
      });
      writeJson(result);
    });

  // --- plugins (plural) ---
  const plugins = program
    .command("plugins")
    .description("Plugins operations (/k/v1/plugins)");

  // GET /k/v1/plugins.json
  plugins
    .command("get")
    .description("Get installed plugins")
    .option("--offset <n>", "Offset")
    .option("--limit <n>", "Limit")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugins get");
      const params: Record<string, unknown> = {};
      if (opts.offset) params.offset = opts.offset;
      if (opts.limit) params.limit = opts.limit;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/plugins.json",
        params,
        authType: global.authType,
      });
      writeJson(result);
    });

  // --- plugins required ---
  const required = plugins.command("required").description("Required plugins");

  // GET /k/v1/plugins/required.json
  required
    .command("get")
    .description("Get required plugins")
    .action(async (_opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugins required get");

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/plugins/required.json",
        authType: global.authType,
      });
      writeJson(result);
    });
};
