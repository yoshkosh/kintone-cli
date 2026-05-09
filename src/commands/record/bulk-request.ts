import { Command } from "commander";
import { kintoneRequest } from "../../client.js";
import { attachEndpoint } from "../../schema-option.js";
import { validateJsonOrThrow } from "../../validator.js";
import { getGlobalOptions, noGuestSpace, writeJson, dryRunOutput, requireOpts } from "../shared.js";

export const registerBulkRequestCommands = (program: Command): void => {
  const bulkRequest = program
    .command("bulk-request")
    .description("Bulk request operations (/k/v1/bulkRequest)");

  // POST /k/v1/bulkRequest.json
  const bulkRequestAdd = bulkRequest
    .command("add")
    .description("Execute multiple API requests in a single call")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "bulk-request add", opts);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

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
  attachEndpoint(bulkRequestAdd, {
    method: "POST",
    path: "/k/v1/bulkRequest.json",
  });
};
