import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import { attachEndpoint } from "../schema-option.js";
import {
  getGlobalOptions,
  noGuestSpace,
  writeJson,
  requireOpts,
} from "./shared.js";

export const registerStatisticsCommands = ({
  program,
}: {
  program: Command;
}): void => {
  // ktapps statistics get
  const apps = program.commands.find((c) => c.name() === "apps");
  if (apps) {
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
  }

  // ktspaces statistics get
  const spaces = program.command("spaces").description("Spaces operations");
  const spacesStats = spaces
    .command("statistics")
    .description("Spaces statistics");

  // GET /k/v1/spaces/statistics.json
  const spacesStatsGet = spacesStats
    .command("get")
    .description("Get space statistics")
    .option("--ids <ids>", "Comma-separated Space IDs")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["ids"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "spaces statistics get", opts);
      const ids = opts.ids.split(",");

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/spaces/statistics.json",
        params: { ids },
        authType: global.authType,
      });
      writeJson(result);
    });
  attachEndpoint(spacesStatsGet, {
    method: "GET",
    path: "/k/v1/spaces/statistics.json",
  });
};
