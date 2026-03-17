import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
} from "./shared.js";

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

  const cursorResult = await kintoneRequest<{ id: string; totalCount: number }>(
    {
      method: "POST",
      path: "/k/v1/records/cursor.json",
      body: cursorBody,
      authType: opts.authType,
      guestSpaceId: opts.guestSpaceId,
    },
  );

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
          await new Promise<void>((resolve) =>
            process.stdout.once("drain", resolve),
          );
        }
      }

      hasNext = page.next;
    }
  } finally {
    await kintoneRequest({
      method: "DELETE",
      path: "/k/v1/records/cursor.json",
      params: { id: cursorId },
      authType: opts.authType,
      guestSpaceId: opts.guestSpaceId,
    }).catch(() => {});
  }
};

export const registerRecordCommands = (
  program: Command,
): { record: Command; records: Command } => {
  const record = program
    .command("record")
    .description("Record operations (/k/v1/record)");

  // GET /k/v1/record.json
  record
    .command("get")
    .description("Get a single record")
    .requiredOption("--app <id>", "App ID")
    .requiredOption("--id <id>", "Record ID")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/record.json",
        params: { app: opts.app, id: opts.id },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });

  // POST /k/v1/record.json
  record
    .command("add")
    .description("Add a single record")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({ method: "POST", path: "/k/v1/record.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/record.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });

  // PUT /k/v1/record.json
  record
    .command("update")
    .description("Update a single record")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({ method: "PUT", path: "/k/v1/record.json", body });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/record.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });

  // records (plural)
  const records = program
    .command("records")
    .description("Records operations (/k/v1/records)");

  // GET /k/v1/records.json
  records
    .command("get")
    .description("Get multiple records")
    .requiredOption("--app <id>", "App ID")
    .option("--query <query>", "Query string")
    .option("--fields <fields>", "Comma-separated field codes")
    .option("--total-count", "Include total count in response")
    .option("--page-all", "Fetch all records using cursor API (NDJSON output)")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const gSpaceId = toGuestSpaceId(global);

      if (opts.pageAll) {
        await fetchAllWithCursor({
          app: Number(opts.app),
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

  // POST /k/v1/records.json
  records
    .command("add")
    .description("Add multiple records")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

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

  // PUT /k/v1/records.json
  records
    .command("update")
    .description("Update multiple records")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

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

  // DELETE /k/v1/records.json
  records
    .command("delete")
    .description("Delete multiple records")
    .requiredOption(
      "--json <payload>",
      "Raw JSON payload (app, ids, revisions)",
    )
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const parsed = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "DELETE",
          path: "/k/v1/records.json",
          params: parsed,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/records.json",
        params: parsed,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });

  return { record, records };
};
