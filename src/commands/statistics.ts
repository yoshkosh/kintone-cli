import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import { getGlobalOptions, noGuestSpace, writeJson } from "./shared.js";

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
    appsStats
      .command("get")
      .description("Get app statistics")
      .requiredOption("--ids <ids>", "Comma-separated App IDs")
      .action(async (opts, cmd) => {
        const global = getGlobalOptions(cmd);
        noGuestSpace(global, "apps statistics get");
        const ids = opts.ids.split(",");

        const result = await kintoneRequest({
          method: "GET",
          path: "/k/v1/apps/statistics.json",
          params: { ids },
          authType: global.authType,
        });
        writeJson(result);
      });
  }

  // ktspaces statistics get
  const spaces = program.command("spaces").description("Spaces operations");
  const spacesStats = spaces
    .command("statistics")
    .description("Spaces statistics");

  // GET /k/v1/spaces/statistics.json
  spacesStats
    .command("get")
    .description("Get space statistics")
    .requiredOption("--ids <ids>", "Comma-separated Space IDs")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "spaces statistics get");
      const ids = opts.ids.split(",");

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/spaces/statistics.json",
        params: { ids },
        authType: global.authType,
      });
      writeJson(result);
    });
};
