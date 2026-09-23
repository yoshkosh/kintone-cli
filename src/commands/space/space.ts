import { Command } from "commander";
import { kintoneRequest } from "../../client.js";
import { attachEndpoint } from "../../schema-option.js";
import { validateJsonOrThrow } from "../../validator.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
  noGuestSpace,
  requireOpts,
  parseJsonOption,
  toInteger,
} from "../shared.js";

export const registerSpaceCommands = (program: Command): { space: Command; spaces: Command } => {
  const space = program.command("space").description("Space operations (/k/v1/space)");

  // GET /k/v1/space.json
  const spaceGet = space
    .command("get")
    .description("Get space info")
    .option("--id <id>", "Space ID")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["id"]);
      const global = getGlobalOptions(cmd);
      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/space.json",
        params: { id: opts.id },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(spaceGet, { method: "GET", path: "/k/v1/space.json" });

  // PUT /k/v1/space.json
  const spaceUpdate = space
    .command("update")
    .description("Update space settings")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({ method: "PUT", path: "/k/v1/space.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/space.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(spaceUpdate, { method: "PUT", path: "/k/v1/space.json" });

  // DELETE /k/v1/space.json
  const spaceDelete = space
    .command("delete")
    .description("Delete a space")
    .option("--id <id>", "Space ID")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["id"]);
      const global = getGlobalOptions(cmd);
      const body = { id: toInteger({ name: "id", value: opts.id }) };

      if (opts.dryRun) {
        dryRunOutput({ method: "DELETE", path: "/k/v1/space.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/space.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(spaceDelete, { method: "DELETE", path: "/k/v1/space.json" });

  // --- space body ---
  const body = space.command("body").description("Space body operations");

  // PUT /k/v1/space/body.json
  const bodyUpdate = body
    .command("update")
    .description("Update space body")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const bodyData = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, bodyData);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/space/body.json",
          body: bodyData,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/space/body.json",
        body: bodyData,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(bodyUpdate, { method: "PUT", path: "/k/v1/space/body.json" });

  // --- space members ---
  const members = space.command("members").description("Space member operations");

  // GET /k/v1/space/members.json
  const membersGet = members
    .command("get")
    .description("Get space members")
    .option("--id <id>", "Space ID")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["id"]);
      const global = getGlobalOptions(cmd);
      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/space/members.json",
        params: { id: opts.id },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(membersGet, {
    method: "GET",
    path: "/k/v1/space/members.json",
  });

  // PUT /k/v1/space/members.json
  const membersUpdate = members
    .command("update")
    .description("Update space members")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const bodyData = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, bodyData);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/space/members.json",
          body: bodyData,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/space/members.json",
        body: bodyData,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(membersUpdate, {
    method: "PUT",
    path: "/k/v1/space/members.json",
  });

  // --- template space ---
  // NOTE: API マップ階層上は「スペース」配下、CLI 階層では `template` 親をトップレベルに持つ。
  // 物理ファイルとしては space.ts に同居（マップ準拠）。
  const template = program.command("template").description("Template operations");
  const templateSpace = template.command("space").description("Space template operations");

  // POST /k/v1/template/space.json
  const templateSpaceAdd = templateSpace
    .command("add")
    .description("Create space from template")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const bodyData = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, bodyData);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/template/space.json",
          body: bodyData,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/template/space.json",
        body: bodyData,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(templateSpaceAdd, {
    method: "POST",
    path: "/k/v1/template/space.json",
  });

  // --- spaces (plural, top-level) ---
  // NOTE: `spaces` は CLI 階層上トップレベル。`space` の子ではなく兄弟。
  const spaces = program.command("spaces").description("Spaces operations (/k/v1/spaces)");

  const spacesStats = spaces.command("statistics").description("Spaces statistics");

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

  return { space, spaces };
};
