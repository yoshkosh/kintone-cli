#!/usr/bin/env node
import { main } from "./cli.js";

process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});

main().then((code) => process.exit(code));
