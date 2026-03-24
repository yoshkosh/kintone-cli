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

program
  .name("ktc")
  .description("kintone REST API CLI")
  .version("0.2.0")
  .option(
    "--auth-type <type>",
    "Authentication type: api-token, password, oauth",
  )
  .option("--guest-space-id <id>", "Guest space ID");

const preview = program
  .command("preview")
  .description("Preview (pre-live) operations (/k/v1/preview)");

const { record } = registerRecordCommands(program);
registerCommentCommands(record);
const { previewApp } = registerPreviewCommands(preview);
registerFileCommands(program);
const { app } = registerAppCommands(program);
registerAclCommands({ program, record, app, preview, previewApp });

program.parseAsync().catch((err: Error) => {
  if (err.name === "KintoneAPIError") {
    process.stderr.write(err.message + "\n");
  } else {
    process.stderr.write(`Error: ${err.message}\n`);
  }
  process.exit(1);
});
