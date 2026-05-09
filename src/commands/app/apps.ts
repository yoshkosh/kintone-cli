import { Command } from "commander";
import { kintoneRequest } from "../../client.js";
import { attachEndpoint } from "../../schema-option.js";
import {
  getGlobalOptions,
  noGuestSpace,
  toGuestSpaceId,
  writeJson,
  requireOpts,
} from "../shared.js";

// NOTE: `apps` は CLI 階層上トップレベル。`app` の子ではなく兄弟として登録する。
export const registerAppsCommands = (program: Command): { apps: Command } => {
  const apps = program.command("apps").description("Apps operations (/k/v1/apps)");

  // GET /k/v1/apps.json — query: 全てオプション
  const appsGet = apps
    .command("get")
    .description("Get apps list")
    .option("--ids <ids>", "Comma-separated App IDs")
    .option("--codes <codes>", "Comma-separated App codes")
    .option("--space-ids <ids>", "Comma-separated Space IDs")
    .option("--name <name>", "App name filter")
    .option("--offset <n>", "Offset")
    .option("--limit <n>", "Limit")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = {};
      if (opts.ids) params.ids = opts.ids.split(",").map(Number);
      if (opts.codes) params.codes = opts.codes.split(",");
      if (opts.spaceIds) params.spaceIds = opts.spaceIds.split(",").map(Number);
      if (opts.name) params.name = opts.name;
      if (opts.offset) params.offset = opts.offset;
      if (opts.limit) params.limit = opts.limit;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/apps.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(appsGet, { method: "GET", path: "/k/v1/apps.json" });

  // --- apps statistics ---
  const appsStats = apps.command("statistics").description("Apps statistics");

  // GET /k/v1/apps/statistics.json
  const appsStatsGet = appsStats
    .command("get")
    .description("Get app statistics")
    .option("--ids <ids>", "Comma-separated App IDs")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["ids"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "apps statistics get", opts);
      const ids = opts.ids.split(",");

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/apps/statistics.json",
        params: { ids },
        authType: global.authType,
      });
      writeJson(result);
    });
  attachEndpoint(appsStatsGet, {
    method: "GET",
    path: "/k/v1/apps/statistics.json",
  });

  return { apps };
};
