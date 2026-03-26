import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import {
  getGlobalOptions,
  noGuestSpace,
  writeJson,
  dryRunOutput,
} from "./shared.js";

export const registerBulkRequestCommands = (program: Command): void => {
  const bulkRequest = program
    .command("bulk-request")
    .description("Bulk request operations (/k/v1/bulkRequest)");

  // POST /k/v1/bulkRequest.json
  bulkRequest
    .command("add")
    .description("Execute multiple API requests in a single call")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "bulk-request add");
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/bulkRequest.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/bulkRequest.json",
        body,
        authType: global.authType,
      });
      writeJson(result);
    });
};
