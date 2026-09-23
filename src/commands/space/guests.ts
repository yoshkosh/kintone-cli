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
  requireGuestSpace,
  requireOpts,
  parseJsonOption,
} from "../shared.js";

// NOTE: `space guests update` はゲストスペース専用 API（requireGuestSpace で --guest-space-id 必須）。
// `guests add` / `guests delete` はシステム管理 API のためゲストスペース指定不可（noGuestSpace）。
// ファイル内で必須／拒否を取り違えないよう注意。
export const registerGuestsCommands = ({
  program,
  space,
}: {
  program: Command;
  space: Command;
}): void => {
  // --- space guests ---
  const guests = space.command("guests").description("Space guest operations");

  // PUT /k/guest/{guestSpaceId}/v1/space/guests.json
  // NOTE: kintone/openapi-spec には通常スペース用の /k/v1/space/guests.json がなく、公式
  // ドキュメントもゲストスペース専用 API としている。--json の検証と --schema はゲスト用
  // パスの定義を参照する（docs/decisions.md 2026-09-23）。送信時のパスは他コマンドと同じく
  // /k/v1/ 形式で渡し、kintoneRequest が --guest-space-id で書き換える。
  const guestsUpdate = guests
    .command("update")
    .description("Update space guests (guest space only; --guest-space-id required)")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      requireGuestSpace(global, "space guests update", opts);
      const bodyData = await parseJsonOption(opts.json);
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
    path: "/k/guest/{guestSpaceId}/v1/space/guests.json",
  });

  // --- guests (top-level) ---
  const guestsCmd = program.command("guests").description("Guest user operations (/k/v1/guests)");

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
      const bodyData = await parseJsonOption(opts.json);
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
      const body = { guests: opts.guests.split(",") };

      if (opts.dryRun) {
        dryRunOutput({
          method: "DELETE",
          path: "/k/v1/guests.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/guests.json",
        body,
        authType: global.authType,
      });
      writeJson(result);
    });
  attachEndpoint(guestsCmdDelete, {
    method: "DELETE",
    path: "/k/v1/guests.json",
  });
};
