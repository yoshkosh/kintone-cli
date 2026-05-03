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

export const registerRecordCommands = (
  program: Command,
): { record: Command } => {
  const record = program
    .command("record")
    .description("Record operations (/k/v1/record)");

  // GET /k/v1/record.json
  const recordGet = record
    .command("get")
    .description("Get a single record")
    .option("--app <id>", "App ID")
    .option("--id <id>", "Record ID")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app", "id"]);
      const global = getGlobalOptions(cmd);
      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/record.json",
        params: { app: opts.app, id: opts.id },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordGet, { method: "GET", path: "/k/v1/record.json" });

  // POST /k/v1/record.json
  const recordAdd = record
    .command("add")
    .description("Add a single record")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({ method: "POST", path: "/k/v1/record.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/record.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordAdd, { method: "POST", path: "/k/v1/record.json" });

  // PUT /k/v1/record.json
  const recordUpdate = record
    .command("update")
    .description("Update a single record")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({ method: "PUT", path: "/k/v1/record.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/record.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordUpdate, { method: "PUT", path: "/k/v1/record.json" });

  return { record };
};
