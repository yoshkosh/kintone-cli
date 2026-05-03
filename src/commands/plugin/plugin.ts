import { Command } from "commander";
import { kintoneRequest } from "../../client.js";
import { attachEndpoint } from "../../schema-option.js";
import { validateJsonOrThrow } from "../../validator.js";
import {
  getGlobalOptions,
  noGuestSpace,
  writeJson,
  dryRunOutput,
  requireOpts,
} from "../shared.js";

export const registerPluginCommands = (program: Command): void => {
  const plugin = program
    .command("plugin")
    .description("Plugin operations (/k/v1/plugin)");

  // POST /k/v1/plugin.json
  const pluginAdd = plugin
    .command("add")
    .description("Install a plugin")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugin add", opts);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

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
  attachEndpoint(pluginAdd, { method: "POST", path: "/k/v1/plugin.json" });

  // PUT /k/v1/plugin.json
  const pluginUpdate = plugin
    .command("update")
    .description("Update a plugin")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugin update", opts);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

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
  attachEndpoint(pluginUpdate, { method: "PUT", path: "/k/v1/plugin.json" });

  // DELETE /k/v1/plugin.json
  const pluginDelete = plugin
    .command("delete")
    .description("Uninstall a plugin")
    .option("--id <id>", "Plugin ID")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["id"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugin delete", opts);
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
  attachEndpoint(pluginDelete, {
    method: "DELETE",
    path: "/k/v1/plugin.json",
  });

  // --- plugin apps ---
  const pluginApps = plugin
    .command("apps")
    .description("Plugin app operations");

  // GET /k/v1/plugin/apps.json
  const pluginAppsGet = pluginApps
    .command("get")
    .description("Get apps using a plugin")
    .option("--id <id>", "Plugin ID")
    .option("--offset <n>", "Offset")
    .option("--limit <n>", "Limit")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["id"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugin apps get", opts);
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
  attachEndpoint(pluginAppsGet, {
    method: "GET",
    path: "/k/v1/plugin/apps.json",
  });

  // --- plugins (plural) ---
  const plugins = program
    .command("plugins")
    .description("Plugins operations (/k/v1/plugins)");

  // GET /k/v1/plugins.json
  const pluginsGet = plugins
    .command("get")
    .description("Get installed plugins")
    .option("--offset <n>", "Offset")
    .option("--limit <n>", "Limit")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugins get", opts);
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
  attachEndpoint(pluginsGet, { method: "GET", path: "/k/v1/plugins.json" });

  // --- plugins required ---
  const required = plugins.command("required").description("Required plugins");

  // GET /k/v1/plugins/required.json
  const requiredGet = required
    .command("get")
    .description("Get required plugins")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "plugins required get", opts);

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/plugins/required.json",
        authType: global.authType,
      });
      writeJson(result);
    });
  attachEndpoint(requiredGet, {
    method: "GET",
    path: "/k/v1/plugins/required.json",
  });
};
