import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import { attachEndpoint } from "../schema-option.js";
import { validateJsonOrThrow } from "../validator.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
  noGuestSpace,
  requireOpts,
} from "./shared.js";

export const registerSpaceCommands = (program: Command): void => {
  const space = program
    .command("space")
    .description("Space operations (/k/v1/space)");

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
      const body = JSON.parse(opts.json);
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
      const params = { id: opts.id };

      if (opts.dryRun) {
        dryRunOutput({ method: "DELETE", path: "/k/v1/space.json", params });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/space.json",
        params,
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
      const bodyData = JSON.parse(opts.json);
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
  const members = space
    .command("members")
    .description("Space member operations");

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
      const bodyData = JSON.parse(opts.json);
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

  // --- space guests ---
  const guests = space.command("guests").description("Space guest operations");

  // PUT /k/v1/space/guests.json
  const guestsUpdate = guests
    .command("update")
    .description("Update space guests")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, bodyData);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/space/guests.json",
          body: bodyData,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/space/guests.json",
        body: bodyData,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(guestsUpdate, {
    method: "PUT",
    path: "/k/v1/space/guests.json",
  });

  // --- space thread ---
  const thread = space.command("thread").description("Space thread operations");

  // POST /k/v1/space/thread.json
  const threadAdd = thread
    .command("add")
    .description("Create a thread")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, bodyData);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/space/thread.json",
          body: bodyData,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/space/thread.json",
        body: bodyData,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(threadAdd, {
    method: "POST",
    path: "/k/v1/space/thread.json",
  });

  // PUT /k/v1/space/thread.json
  const threadUpdate = thread
    .command("update")
    .description("Update a thread")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, bodyData);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/space/thread.json",
          body: bodyData,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/space/thread.json",
        body: bodyData,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(threadUpdate, {
    method: "PUT",
    path: "/k/v1/space/thread.json",
  });

  // --- space thread comment ---
  const threadComment = thread
    .command("comment")
    .description("Thread comment operations");

  // POST /k/v1/space/thread/comment.json
  const threadCommentAdd = threadComment
    .command("add")
    .description("Add a thread comment")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, bodyData);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/space/thread/comment.json",
          body: bodyData,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/space/thread/comment.json",
        body: bodyData,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(threadCommentAdd, {
    method: "POST",
    path: "/k/v1/space/thread/comment.json",
  });

  // --- template space ---
  const template = program
    .command("template")
    .description("Template operations");
  const templateSpace = template
    .command("space")
    .description("Space template operations");

  // POST /k/v1/template/space.json
  const templateSpaceAdd = templateSpace
    .command("add")
    .description("Create space from template")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);
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

  // --- guests (top-level) ---
  const guestsCmd = program
    .command("guests")
    .description("Guest user operations (/k/v1/guests)");

  // POST /k/v1/guests.json
  const guestsCmdAdd = guestsCmd
    .command("add")
    .description("Add guest users")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "guests add", opts);
      const bodyData = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, bodyData);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/guests.json",
          body: bodyData,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/guests.json",
        body: bodyData,
        authType: global.authType,
      });
      writeJson(result);
    });
  attachEndpoint(guestsCmdAdd, { method: "POST", path: "/k/v1/guests.json" });

  // DELETE /k/v1/guests.json
  const guestsCmdDelete = guestsCmd
    .command("delete")
    .description("Delete guest users")
    .option("--guests <emails>", "Comma-separated guest email addresses")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["guests"]);
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "guests delete", opts);
      const params = { guests: opts.guests.split(",") };

      if (opts.dryRun) {
        dryRunOutput({
          method: "DELETE",
          path: "/k/v1/guests.json",
          params,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/guests.json",
        params,
        authType: global.authType,
      });
      writeJson(result);
    });
  attachEndpoint(guestsCmdDelete, {
    method: "DELETE",
    path: "/k/v1/guests.json",
  });
};
