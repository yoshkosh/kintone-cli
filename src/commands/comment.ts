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

export const registerCommentCommands = (record: Command): void => {
  const comment = record
    .command("comment")
    .description("Comment operations (/k/v1/record/comment)");

  // POST /k/v1/record/comment.json
  const commentAdd = comment
    .command("add")
    .description("Add a comment to a record")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/record/comment.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/record/comment.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(commentAdd, {
    method: "POST",
    path: "/k/v1/record/comment.json",
  });

  // DELETE /k/v1/record/comment.json
  const commentDelete = comment
    .command("delete")
    .description("Delete a comment from a record")
    .option("--app <id>", "App ID")
    .option("--record <id>", "Record ID")
    .option("--comment <id>", "Comment ID")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app", "record", "comment"]);
      const global = getGlobalOptions(cmd);
      const params = {
        app: opts.app,
        record: opts.record,
        comment: opts.comment,
      };

      if (opts.dryRun) {
        dryRunOutput({
          method: "DELETE",
          path: "/k/v1/record/comment.json",
          params,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/record/comment.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(commentDelete, {
    method: "DELETE",
    path: "/k/v1/record/comment.json",
  });

  // GET /k/v1/record/comments.json
  const comments = record
    .command("comments")
    .description("Comments operations (/k/v1/record/comments)");

  const commentsGet = comments
    .command("get")
    .description("Get comments from a record")
    .option("--app <id>", "App ID")
    .option("--record <id>", "Record ID")
    .option("--order <order>", "Sort order: ASC or DESC")
    .option("--offset <offset>", "Number of comments to skip")
    .option("--limit <limit>", "Number of comments to retrieve (max 10)")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app", "record"]);
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = {
        app: opts.app,
        record: opts.record,
      };
      if (opts.order) params.order = opts.order;
      if (opts.offset) params.offset = opts.offset;
      if (opts.limit) params.limit = opts.limit;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/record/comments.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(commentsGet, {
    method: "GET",
    path: "/k/v1/record/comments.json",
  });
};
