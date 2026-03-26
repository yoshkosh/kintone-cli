import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
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
  recordStatus
    .command("update")
    .description("Update record status")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

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

  // --- record assignees ---
  const recordAssignees = record
    .command("assignees")
    .description("Record assignees operations");

  // PUT /k/v1/record/assignees.json
  recordAssignees
    .command("update")
    .description("Update record assignees")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

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

  // --- records status ---
  const recordsStatus = records
    .command("status")
    .description("Records status operations");

  // PUT /k/v1/records/status.json
  recordsStatus
    .command("update")
    .description("Update multiple record statuses")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

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

  // --- records acl-evaluate ---
  const recordsAclEvaluate = records
    .command("acl-evaluate")
    .description("Records ACL evaluate");

  // GET /k/v1/records/acl/evaluate.json
  recordsAclEvaluate
    .command("get")
    .description("Evaluate record ACL permissions")
    .requiredOption("--app <id>", "App ID")
    .requiredOption("--ids <ids>", "Comma-separated Record IDs")
    .action(async (opts, cmd) => {
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
};
