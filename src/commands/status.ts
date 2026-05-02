import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import { attachEndpoint } from "../schema-option.js";
import { validateJsonOrThrow } from "../validator.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
  requireOpts,
} from "./shared.js";

export const registerStatusCommands = ({
  record,
  records,
}: {
  record: Command;
  records: Command;
}): void => {
  // --- record status ---
  const recordStatus = record
    .command("status")
    .description("Record status operations");

  // PUT /k/v1/record/status.json
  const recordStatusUpdate = recordStatus
    .command("update")
    .description("Update record status")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/record/status.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/record/status.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordStatusUpdate, {
    method: "PUT",
    path: "/k/v1/record/status.json",
  });

  // --- record assignees ---
  const recordAssignees = record
    .command("assignees")
    .description("Record assignees operations");

  // PUT /k/v1/record/assignees.json
  const recordAssigneesUpdate = recordAssignees
    .command("update")
    .description("Update record assignees")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/record/assignees.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/record/assignees.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordAssigneesUpdate, {
    method: "PUT",
    path: "/k/v1/record/assignees.json",
  });

  // --- records status ---
  const recordsStatus = records
    .command("status")
    .description("Records status operations");

  // PUT /k/v1/records/status.json
  const recordsStatusUpdate = recordsStatus
    .command("update")
    .description("Update multiple record statuses")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/records/status.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/records/status.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordsStatusUpdate, {
    method: "PUT",
    path: "/k/v1/records/status.json",
  });

  // --- records acl-evaluate ---
  const recordsAclEvaluate = records
    .command("acl-evaluate")
    .description("Records ACL evaluate");

  // GET /k/v1/records/acl/evaluate.json
  const recordsAclEvaluateGet = recordsAclEvaluate
    .command("get")
    .description("Evaluate record ACL permissions")
    .option("--app <id>", "App ID")
    .option("--ids <ids>", "Comma-separated Record IDs")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app", "ids"]);
      const global = getGlobalOptions(cmd);
      const ids = opts.ids.split(",");
      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/records/acl/evaluate.json",
        params: { app: opts.app, ids },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordsAclEvaluateGet, {
    method: "GET",
    path: "/k/v1/records/acl/evaluate.json",
  });
};
