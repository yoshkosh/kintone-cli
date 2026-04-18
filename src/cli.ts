import { Command, CommanderError } from "commander";
import { registerRecordCommands } from "./commands/record.js";
import { registerPreviewCommands } from "./commands/preview.js";
import { registerFileCommands } from "./commands/file.js";
import { registerAppCommands } from "./commands/app.js";
import { registerAclCommands } from "./commands/acl.js";
import { registerCommentCommands } from "./commands/comment.js";
import { registerStatusCommands } from "./commands/status.js";
import { registerSpaceCommands } from "./commands/space.js";
import { registerAppSettingsCommands } from "./commands/app-settings.js";
import { registerAppPluginsCommands } from "./commands/app-plugins.js";
import { registerPluginCommands } from "./commands/plugin.js";
import { registerBulkRequestCommands } from "./commands/bulk-request.js";
import { registerStatisticsCommands } from "./commands/statistics.js";

export const createProgram = (): Command => {
  const program = new Command();

  program
    .name("kt")
    .description("kintone REST API CLI")
    .version("0.5.0")
    .option(
      "--auth-type <type>",
      "Authentication type: api-token, password, oauth",
    )
    .option("--guest-space-id <id>", "Guest space ID");

  const preview = program
    .command("preview")
    .description("Preview (pre-live) operations (/k/v1/preview)");

  const { record, records } = registerRecordCommands(program);
  registerCommentCommands(record);
  registerStatusCommands({ record, records });
  const { previewApp } = registerPreviewCommands(preview);
  registerFileCommands(program);
  const { app } = registerAppCommands(program);
  registerAclCommands({ program, record, app, preview, previewApp });
  registerAppSettingsCommands({ app, previewApp });
  registerAppPluginsCommands({ app, previewApp });
  registerSpaceCommands(program);
  registerPluginCommands(program);
  registerBulkRequestCommands(program);
  registerStatisticsCommands({ program });

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
    if (err instanceof Error && err.name === "KintoneAPIError") {
      process.stderr.write(err.message + "\n");
      return 1;
    }
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    return 1;
  }
};
