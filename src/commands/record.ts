import { Command } from "commander";
import { kintoneRequest } from "../client.js";

type GlobalOptions = {
  authType?: string;
  guestSpaceId?: string;
};

const getGlobalOptions = (cmd: Command): GlobalOptions => {
  const root = cmd.optsWithGlobals();
  return {
    authType: root.authType,
    guestSpaceId: root.guestSpaceId,
  };
};

const guestSpaceId = (global: GlobalOptions): number | undefined =>
  global.guestSpaceId ? Number(global.guestSpaceId) : undefined;

type CursorOptions = {
  app: number;
  query?: string;
  fields?: string[];
  authType?: string;
  guestSpaceId?: number;
};

const fetchAllWithCursor = async (opts: CursorOptions): Promise<void> => {
  // 1. POST /k/v1/records/cursor.json — カーソル作成
  const cursorBody: Record<string, unknown> = { app: opts.app, size: 500 };
  if (opts.query) cursorBody.query = opts.query;
  if (opts.fields) cursorBody.fields = opts.fields;

  const cursorResult = (await kintoneRequest({
    method: "POST",
    path: "/k/v1/records/cursor.json",
    body: cursorBody,
    authType: opts.authType,
    guestSpaceId: opts.guestSpaceId,
  })) as { id: string; totalCount: number };

  const cursorId = cursorResult.id;

  try {
    // 2. GET /k/v1/records/cursor.json — ページごとに取得してNDJSON出力
    let hasNext = true;
    while (hasNext) {
      const page = (await kintoneRequest({
        method: "GET",
        path: "/k/v1/records/cursor.json",
        params: { id: cursorId },
        authType: opts.authType,
        guestSpaceId: opts.guestSpaceId,
      })) as { records: unknown[]; next: boolean };

      for (const record of page.records) {
        const ok = process.stdout.write(JSON.stringify(record) + "\n");
        // バックプレッシャー対応: パイプ先が詰まったら待つ
        if (!ok) {
          await new Promise<void>((resolve) =>
            process.stdout.once("drain", resolve),
          );
        }
      }

      hasNext = page.next;
    }
  } finally {
    // 3. DELETE /k/v1/records/cursor.json — カーソル削除（エラー時も必ず実行）
    await kintoneRequest({
      method: "DELETE",
      path: "/k/v1/records/cursor.json",
      params: { id: cursorId },
      authType: opts.authType,
      guestSpaceId: opts.guestSpaceId,
    }).catch(() => {
      // カーソル削除の失敗は無視（全件取得完了後は自動削除されるため）
    });
  }
};

export const registerRecordCommands = (program: Command): void => {
  program
    .option(
      "--auth-type <type>",
      "Authentication type: api-token, password, oauth",
    )
    .option("--guest-space-id <id>", "Guest space ID");

  const record = program
    .command("record")
    .description("Record operations (/k/v1/record)");

  // GET /k/v1/record.json — クエリパラメータ: app(必須), id(必須)
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
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // POST /k/v1/record.json — requestBody: app(必須), record(必須)
  record
    .command("add")
    .description("Add a single record")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        process.stdout.write(
          JSON.stringify(
            { dryRun: true, method: "POST", path: "/k/v1/record.json", body },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/record.json",
        body,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // PUT /k/v1/record.json — requestBody: app(必須), id/updateKey, record, revision
  record
    .command("update")
    .description("Update a single record")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        process.stdout.write(
          JSON.stringify(
            { dryRun: true, method: "PUT", path: "/k/v1/record.json", body },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/record.json",
        body,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // records (plural)
  const records = program
    .command("records")
    .description("Records operations (/k/v1/records)");

  // GET /k/v1/records.json — クエリパラメータ: app(必須), query, fields[], totalCount
  // --page-all: cursor APIで全件取得し、NDJSON形式でストリーム出力
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
      const gSpaceIdValue = guestSpaceId(global);

      if (opts.pageAll) {
        await fetchAllWithCursor({
          app: Number(opts.app),
          query: opts.query,
          fields: opts.fields?.split(","),
          authType: global.authType,
          guestSpaceId: gSpaceIdValue,
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
        guestSpaceId: gSpaceIdValue,
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // POST /k/v1/records.json — requestBody: app(必須), records(必須)
  records
    .command("add")
    .description("Add multiple records")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        process.stdout.write(
          JSON.stringify(
            { dryRun: true, method: "POST", path: "/k/v1/records.json", body },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/records.json",
        body,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // PUT /k/v1/records.json — requestBody: app(必須), records(必須), upsert
  records
    .command("update")
    .description("Update multiple records")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        process.stdout.write(
          JSON.stringify(
            { dryRun: true, method: "PUT", path: "/k/v1/records.json", body },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/records.json",
        body,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // DELETE /k/v1/records.json — クエリパラメータ: app(必須), ids[](必須), revisions[]
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
        process.stdout.write(
          JSON.stringify(
            {
              dryRun: true,
              method: "DELETE",
              path: "/k/v1/records.json",
              params: parsed,
            },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/records.json",
        params: parsed,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });
};
