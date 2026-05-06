import { createRequire } from "node:module";
import { Command, CommanderError } from "commander";
// record/
import { registerRecordCommands } from "./commands/record/record.js";
import { registerRecordsCommands } from "./commands/record/records.js";
import { registerCommentCommands } from "./commands/record/comment.js";
import { registerProcessCommands } from "./commands/record/process.js";
import { registerAclEvaluateCommands } from "./commands/record/acl-evaluate.js";
import { registerBulkRequestCommands } from "./commands/record/bulk-request.js";
// file/
import { registerFileCommands } from "./commands/file/file.js";
// app/
import { registerAppCommands } from "./commands/app/app.js";
import { registerAppsCommands } from "./commands/app/apps.js";
import { registerAppFormFieldsCommands } from "./commands/app/form-fields.js";
import { registerAppFormLayoutCommands } from "./commands/app/form-layout.js";
import { registerAppSettingsCommands } from "./commands/app/settings.js";
import { registerAppDeployCommands } from "./commands/app/deploy.js";
import { registerAppPluginsCommands } from "./commands/app/plugins.js";
import { registerAppAclCommands } from "./commands/app/acl.js";
import { registerAppMoveCommands } from "./commands/app/move.js";
// space/
import { registerSpaceCommands } from "./commands/space/space.js";
import { registerThreadCommands } from "./commands/space/thread.js";
import { registerGuestsCommands } from "./commands/space/guests.js";
// plugin/
import { registerPluginCommands } from "./commands/plugin/plugin.js";
import {
  installSchemaOption,
  installSkipValidationOption,
} from "./schema-option.js";
import { JsonValidationError } from "./validator.js";

// NOTE: package.json から動的に version を読む。0.6.0 で commander 引数が "0.5.3" の
// まま出荷された不具合（手動 bump 漏れ）を再発させない。dist 出力は src の 1 つ上が
// パッケージルートになる構成（rootDir: ./src, outDir: ./dist）。
const require = createRequire(import.meta.url);
const { version: CLI_VERSION } = require("../package.json") as {
  version: string;
};

export const createProgram = (): Command => {
  const program = new Command();

  program
    .name("kt")
    .description("kintone REST API CLI")
    .version(CLI_VERSION)
    .option(
      "--auth-type <type>",
      "Authentication type: api-token, password, oauth",
    )
    .option("--guest-space-id <id>", "Guest space ID");

  const preview = program
    .command("preview")
    .description("Preview (pre-live) operations (/k/v1/preview)");
  const previewApp = preview
    .command("app")
    .description("Preview app operations");

  // record
  const { record } = registerRecordCommands(program);
  const { records } = registerRecordsCommands(program);
  registerCommentCommands({ record });
  registerProcessCommands({ record, records });
  registerAclEvaluateCommands({ records });
  registerBulkRequestCommands(program);

  // file
  registerFileCommands(program);

  // app
  const { app } = registerAppCommands({ program, previewApp });
  registerAppsCommands(program);
  registerAppFormFieldsCommands({ app, previewApp });
  registerAppFormLayoutCommands({ app, previewApp });
  registerAppSettingsCommands({ app, previewApp });
  registerAppDeployCommands({ previewApp });
  registerAppPluginsCommands({ app, previewApp });
  registerAppAclCommands({ program, record, app, preview, previewApp });
  registerAppMoveCommands({ app });

  // space
  const { space } = registerSpaceCommands(program);
  registerThreadCommands({ space });
  registerGuestsCommands({ program, space });

  // plugin
  registerPluginCommands(program);

  installSchemaOption(program);
  installSkipValidationOption(program);

  return program;
};

export const main = async (
  argv: readonly string[] = process.argv,
): Promise<number> => {
  const program = createProgram();
  program.exitOverride();
  try {
    await program.parseAsync(argv as string[]);
    return 0;
  } catch (err) {
    // commander throws CommanderError for --help / --version / missing args.
    // Honor err.exitCode so help/version stay at 0 instead of being coerced to 1.
    if (err instanceof CommanderError) {
      return err.exitCode;
    }
    if (err instanceof JsonValidationError) {
      // NOTE: validation 失敗のみ JSON 形式で stderr 出力する。
      // 引数不正・認証未設定等の他の CLI エラーは従来通りテキスト出力 (下の分岐)。
      process.stderr.write(JSON.stringify(err.toPayload()) + "\n");
      return 1;
    }
    if (err instanceof Error && err.name === "KintoneAPIError") {
      process.stderr.write(err.message + "\n");
      return 1;
    }
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    return 1;
  }
};
