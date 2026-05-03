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
} from "../shared.js";

// NOTE: `space guests update` は通常スペースに加えてゲストスペースも対象（toGuestSpaceId 経由）。
// `guests add` / `guests delete` はシステム管理 API のためゲストスペース指定不可（noGuestSpace）。
// ファイル内で許可／拒否を取り違えないよう注意。
export const registerGuestsCommands = ({
  program,
  space,
}: {
  program: Command;
  space: Command;
}): void => {
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
