import { Command } from "commander";
import { kintoneRequest } from "../../client.js";
import { attachEndpoint } from "../../schema-option.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  requireOpts,
} from "../shared.js";

export const registerAclEvaluateCommands = ({
  records,
}: {
  records: Command;
}): void => {
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
