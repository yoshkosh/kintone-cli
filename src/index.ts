#!/usr/bin/env node

// パイプが閉じたときに静かに終了する
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});

import { program } from "commander";
import { registerRecordCommands } from "./commands/record.js";
import { registerPreviewCommands } from "./commands/preview.js";
import { registerFileCommands } from "./commands/file.js";

program.name("ktc").description("kintone REST API CLI").version("0.1.0");

registerRecordCommands(program);
registerPreviewCommands(program);
registerFileCommands(program);

program.parseAsync().catch((err: Error) => {
  if (err.name === "KintoneAPIError") {
    process.stderr.write(err.message + "\n");
  } else {
    process.stderr.write(`Error: ${err.message}\n`);
  }
  process.exit(1);
});
