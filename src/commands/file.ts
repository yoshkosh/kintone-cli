import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { Command } from "commander";
import { resolveAuth, buildAuthHeaders } from "../auth.js";
import { getBaseUrl, buildPath } from "../client.js";
import { getGlobalOptions, toGuestSpaceId } from "./shared.js";

export const registerFileCommands = (program: Command): void => {
  const file = program
    .command("file")
    .description("File operations (/k/v1/file)");

  // GET /k/v1/file.json — バイナリレスポンス
  file
    .command("get")
    .description("Download a file")
    .requiredOption("--file-key <key>", "File key")
    .option("--output <path>", "Output file path (default: stdout)")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const gSpaceId = toGuestSpaceId(global);
      const baseUrl = getBaseUrl();
      const auth = resolveAuth(global.authType);
      const headers = buildAuthHeaders(auth);
      const fullPath = buildPath("/k/v1/file.json", gSpaceId);
      const url = new URL(fullPath, baseUrl);
      url.searchParams.set("fileKey", opts.fileKey);

      const response = await fetch(url.toString(), { method: "GET", headers });

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(errorBody);
        error.name = "KintoneAPIError";
        throw error;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (opts.output) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(opts.output, buffer);
        process.stdout.write(
          JSON.stringify({ downloaded: opts.output, size: buffer.length }) +
            "\n",
        );
      } else {
        process.stdout.write(buffer);
      }
    });

  // POST /k/v1/file.json — multipart/form-data
  file
    .command("add")
    .description("Upload a file")
    .requiredOption("--file <path>", "File path to upload")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const gSpaceId = toGuestSpaceId(global);
      const baseUrl = getBaseUrl();
      const auth = resolveAuth(global.authType);
      const headers = buildAuthHeaders(auth);
      const fullPath = buildPath("/k/v1/file.json", gSpaceId);
      const url = new URL(fullPath, baseUrl);

      const fileContent = readFileSync(opts.file);
      const fileName = basename(opts.file);
      const blob = new Blob([fileContent]);
      const formData = new FormData();
      formData.append("file", blob, fileName);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
      });

      const responseBody = await response.text();

      if (!response.ok) {
        const error = new Error(responseBody);
        error.name = "KintoneAPIError";
        throw error;
      }

      process.stdout.write(
        JSON.stringify(JSON.parse(responseBody), undefined, 2) + "\n",
      );
    });
};
