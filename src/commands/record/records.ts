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
  toInteger,
} from "../shared.js";

type CursorOptions = {
  app: number;
  query?: string;
  fields?: string[];
  authType?: string;
  guestSpaceId?: number;
};

const fetchAllWithCursor = async (opts: CursorOptions): Promise<void> => {
  const cursorBody: Record<string, unknown> = { app: opts.app, size: 500 };
  if (opts.query) cursorBody.query = opts.query;
  if (opts.fields) cursorBody.fields = opts.fields;

  const cursorResult = await kintoneRequest<{ id: string; totalCount: number }>({
    method: "POST",
    path: "/k/v1/records/cursor.json",
    body: cursorBody,
    authType: opts.authType,
    guestSpaceId: opts.guestSpaceId,
  });

  const cursorId = cursorResult.id;

  try {
    let hasNext = true;
    while (hasNext) {
      const page = await kintoneRequest<{ records: unknown[]; next: boolean }>({
        method: "GET",
        path: "/k/v1/records/cursor.json",
        params: { id: cursorId },
        authType: opts.authType,
        guestSpaceId: opts.guestSpaceId,
      });

      for (const record of page.records) {
        const ok = process.stdout.write(JSON.stringify(record) + "\n");
        if (!ok) {
          await new Promise<void>((resolve) => process.stdout.once("drain", resolve));
        }
      }

      hasNext = page.next;
    }
  } finally {
    await kintoneRequest({
      method: "DELETE",
      path: "/k/v1/records/cursor.json",
      body: { id: cursorId },
      authType: opts.authType,
      guestSpaceId: opts.guestSpaceId,
    }).catch(() => {});
  }
};

export const registerRecordsCommands = (program: Command): { records: Command } => {
  const records = program.command("records").description("Records operations (/k/v1/records)");

  // GET /k/v1/records.json
  const recordsGet = records
    .command("get")
    .description("Get multiple records")
    .option("--app <id>", "App ID")
    .option("--query <query>", "Query string")
    .option("--fields <fields>", "Comma-separated field codes")
    .option("--total-count", "Include total count in response")
    .option("--page-all", "Fetch all records using cursor API (NDJSON output)")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
      const global = getGlobalOptions(cmd);
      const gSpaceId = toGuestSpaceId(global);

      if (opts.pageAll) {
        await fetchAllWithCursor({
          app: toInteger({ name: "app", value: opts.app }),
          query: opts.query,
          fields: opts.fields?.split(","),
          authType: global.authType,
          guestSpaceId: gSpaceId,
        });
        return;
      }

      const params: Record<string, unknown> = { app: opts.app };
      if (opts.query) params.query = opts.query;
      if (opts.fields) params.fields = opts.fields.split(",");
      if (opts.totalCount) params.totalCount = true;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/records.json",
        params,
        authType: global.authType,
        guestSpaceId: gSpaceId,
      });
      writeJson(result);
    });
  attachEndpoint(recordsGet, { method: "GET", path: "/k/v1/records.json" });

  // POST /k/v1/records.json
  const recordsAdd = records
    .command("add")
    .description("Add multiple records")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({ method: "POST", path: "/k/v1/records.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/records.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordsAdd, { method: "POST", path: "/k/v1/records.json" });

  // PUT /k/v1/records.json
  const recordsUpdate = records
    .command("update")
    .description("Update multiple records")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({ method: "PUT", path: "/k/v1/records.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/records.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordsUpdate, { method: "PUT", path: "/k/v1/records.json" });

  // DELETE /k/v1/records.json
  const recordsDelete = records
    .command("delete")
    .description("Delete multiple records")
    .option("--json <payload>", "Raw JSON payload (app, ids, revisions)")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = await parseJsonOption(opts.json);
      // NOTE: kintone/openapi-spec は DELETE のパラメータを requestBody で定義する。
      // 公式ドキュメントの例も JSON ボディのため、query string には展開しない。
      validateJsonOrThrow(cmd, opts, body);

      if (opts.dryRun) {
        dryRunOutput({ method: "DELETE", path: "/k/v1/records.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/records.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(recordsDelete, {
    method: "DELETE",
    path: "/k/v1/records.json",
  });

  return { records };
};
