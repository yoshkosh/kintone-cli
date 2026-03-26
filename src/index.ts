#!/usr/bin/env node

process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});

import { program } from "commander";
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

program
  .name("ktc")
  .description("kintone REST API CLI")
  .version("0.4.0")
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

program.parseAsync().catch((err: Error) => {
  if (err.name === "KintoneAPIError") {
    process.stderr.write(err.message + "\n");
  } else {
    process.stderr.write(`Error: ${err.message}\n`);
  }
  process.exit(1);
});
