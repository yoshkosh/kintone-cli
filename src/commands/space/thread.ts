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
  parseJsonOption,
} from "../shared.js";

export const registerThreadCommands = ({ space }: { space: Command }): void => {
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
      const bodyData = await parseJsonOption(opts.json);
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
      const bodyData = await parseJsonOption(opts.json);
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
  const threadComment = thread.command("comment").description("Thread comment operations");

  // POST /k/v1/space/thread/comment.json
  const threadCommentAdd = threadComment
    .command("add")
    .description("Add a thread comment")
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
};
