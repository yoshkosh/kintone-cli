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

// NOTE: app / field / record の ACL は API マップ「アプリ／アクセス権」セクション配下のため
// 本ファイル一箇所で集約管理する。CLI 階層との不一致 (field-acl はトップレベル、record-acl は
// preview 配下に直接ぶら下がる) は意図的でマップ階層に従っている。

const registerAclGet = ({
  parent,
  path,
  hasLang,
}: {
  parent: Command;
  path: string;
  hasLang?: boolean;
}): void => {
  const cmd = parent.command("get").description(`Get ACL`).option("--app <id>", "App ID");

  if (hasLang) {
    cmd.option("--lang <lang>", "Language: default, en, zh, ja, user");
  }

  cmd.action(async (opts, c) => {
    requireOpts(opts, ["app"]);
    const global = getGlobalOptions(c);
    const params: Record<string, unknown> = { app: opts.app };
    if (opts.lang) params.lang = opts.lang;

    const result = await kintoneRequest({
      method: "GET",
      path,
      params,
      authType: global.authType,
      guestSpaceId: toGuestSpaceId(global),
    });
    writeJson(result);
  });
  attachEndpoint(cmd, { method: "GET", path });
};

const registerAclUpdate = ({ parent, path }: { parent: Command; path: string }): void => {
  const cmd = parent
    .command("update")
    .description("Update ACL")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({ method: "PUT", path, body });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path,
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(cmd, { method: "PUT", path });
};

export const registerAppAclCommands = ({
  program,
  record,
  app,
  preview,
  previewApp,
}: {
  program: Command;
  record: Command;
  app: Command;
  preview: Command;
  previewApp: Command;
}): void => {
  // --- Live ACL GET ---

  // ktapp acl get → GET /k/v1/app/acl.json
  const appAcl = app.command("acl").description("App ACL operations");
  registerAclGet({ parent: appAcl, path: "/k/v1/app/acl.json" });

  // ktfield-acl get → GET /k/v1/field/acl.json
  const fieldAcl = program
    .command("field-acl")
    .description("Field ACL operations (/k/v1/field/acl)");
  registerAclGet({ parent: fieldAcl, path: "/k/v1/field/acl.json" });

  // ktrecord acl get → GET /k/v1/record/acl.json
  const recordAcl = record.command("acl").description("Record ACL operations");
  registerAclGet({
    parent: recordAcl,
    path: "/k/v1/record/acl.json",
    hasLang: true,
  });

  // --- Preview ACL GET + PUT ---

  // ktpreview app acl get/update → /k/v1/preview/app/acl.json
  const previewAppAcl = previewApp.command("acl").description("Preview app ACL operations");
  registerAclGet({ parent: previewAppAcl, path: "/k/v1/preview/app/acl.json" });
  registerAclUpdate({
    parent: previewAppAcl,
    path: "/k/v1/preview/app/acl.json",
  });

  // ktpreview field-acl get/update → /k/v1/preview/field/acl.json
  const previewFieldAcl = preview.command("field-acl").description("Preview field ACL operations");
  registerAclGet({
    parent: previewFieldAcl,
    path: "/k/v1/preview/field/acl.json",
  });
  registerAclUpdate({
    parent: previewFieldAcl,
    path: "/k/v1/preview/field/acl.json",
  });

  // ktpreview record-acl get/update → /k/v1/preview/record/acl.json
  const previewRecordAcl = preview
    .command("record-acl")
    .description("Preview record ACL operations");
  registerAclGet({
    parent: previewRecordAcl,
    path: "/k/v1/preview/record/acl.json",
    hasLang: true,
  });
  registerAclUpdate({
    parent: previewRecordAcl,
    path: "/k/v1/preview/record/acl.json",
  });
};
