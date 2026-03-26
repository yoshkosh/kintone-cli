import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
  noGuestSpace,
} from "./shared.js";

export const registerSpaceCommands = (program: Command): void => {
  const space = program
    .command("space")
    .description("Space operations (/k/v1/space)");

  // GET /k/v1/space.json
  space
    .command("get")
    .description("Get space info")
    .requiredOption("--id <id>", "Space ID")
    .action(async (opts, cmd) => {
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

  // PUT /k/v1/space.json
  space
    .command("update")
    .description("Update space settings")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

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

  // DELETE /k/v1/space.json
  space
    .command("delete")
    .description("Delete a space")
    .requiredOption("--id <id>", "Space ID")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
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

  // --- space body ---
  const body = space.command("body").description("Space body operations");

  // PUT /k/v1/space/body.json
  body
    .command("update")
    .description("Update space body")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);

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

  // --- space members ---
  const members = space
    .command("members")
    .description("Space member operations");

  // GET /k/v1/space/members.json
  members
    .command("get")
    .description("Get space members")
    .requiredOption("--id <id>", "Space ID")
    .action(async (opts, cmd) => {
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

  // PUT /k/v1/space/members.json
  members
    .command("update")
    .description("Update space members")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);

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

  // --- space guests ---
  const guests = space.command("guests").description("Space guest operations");

  // PUT /k/v1/space/guests.json
  guests
    .command("update")
    .description("Update space guests")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);

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

  // --- space thread ---
  const thread = space.command("thread").description("Space thread operations");

  // POST /k/v1/space/thread.json
  thread
    .command("add")
    .description("Create a thread")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);

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

  // PUT /k/v1/space/thread.json
  thread
    .command("update")
    .description("Update a thread")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);

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

  // --- space thread comment ---
  const threadComment = thread
    .command("comment")
    .description("Thread comment operations");

  // POST /k/v1/space/thread/comment.json
  threadComment
    .command("add")
    .description("Add a thread comment")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);

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

  // --- template space ---
  const template = program
    .command("template")
    .description("Template operations");
  const templateSpace = template
    .command("space")
    .description("Space template operations");

  // POST /k/v1/template/space.json
  templateSpace
    .command("add")
    .description("Create space from template")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const bodyData = JSON.parse(opts.json);

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

  // --- guests (top-level) ---
  const guestsCmd = program
    .command("guests")
    .description("Guest user operations (/k/v1/guests)");

  // POST /k/v1/guests.json
  guestsCmd
    .command("add")
    .description("Add guest users")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "guests add");
      const bodyData = JSON.parse(opts.json);

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

  // DELETE /k/v1/guests.json
  guestsCmd
    .command("delete")
    .description("Delete guest users")
    .requiredOption(
      "--guests <emails>",
      "Comma-separated guest email addresses",
    )
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      noGuestSpace(global, "guests delete");
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
};
