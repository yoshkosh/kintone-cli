#!/usr/bin/env node

import { program } from "commander";
import { registerRecordCommands } from "./commands/record.js";
import { registerPreviewCommands } from "./commands/preview.js";
import { registerFileCommands } from "./commands/file.js";

program.name("ktc").description("kintone REST API CLI").version("0.1.0");

registerRecordCommands(program);
registerPreviewCommands(program);
registerFileCommands(program);

program.parse();
