import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetch as undiciFetch, MockAgent, setGlobalDispatcher } from "undici";
import { main } from "./cli.js";
import { assertRequestMatchesSpec } from "./__test-helpers__/spec-validator.js";

const GET_FIXTURE = { record: { name: { value: "test" } } };
const GET_EXPECTED_STDOUT = JSON.stringify(GET_FIXTURE, undefined, 2) + "\n";
const BASE_URL = "https://example.cybozu.com";

type MockPool = ReturnType<MockAgent["get"]>;

// Wraps MockAgent.get() so every pool.intercept(...) call is first validated
// against the kintone OpenAPI Spec. Catches typos in test expectations
// (wrong path, missing required query param, unknown extra field) before
// they slip through as green tests.
const createValidatedPool = (agent: MockAgent, origin: string): MockPool => {
  const pool = agent.get(origin);
  const orig = pool.intercept.bind(pool);
  pool.intercept = ((match: Parameters<MockPool["intercept"]>[0]) => {
    assertRequestMatchesSpec(
      match as Parameters<typeof assertRequestMatchesSpec>[0],
    );
    return orig(match);
  }) as MockPool["intercept"];
  return pool;
};

/**
 * `records get --page-all` が叩く cursor API の 3 段呼び出し
 * (POST 作成 → GET ページ ×N → DELETE クリーンアップ) をまとめて配線する。
 * 戻り値は `pages` を平坦化した NDJSON (record 毎に JSON + "\n")。
 */
const mockCursorSequence = (config: {
  pool: MockPool;
  app: number;
  cursorId: string;
  pages: unknown[][];
  authHeader: Record<string, string>;
}): string => {
  const { pool, app, cursorId, pages, authHeader } = config;
  const totalCount = pages.reduce((acc, p) => acc + p.length, 0);

  pool
    .intercept({
      path: "/k/v1/records/cursor.json",
      method: "POST",
      body: JSON.stringify({ app, size: 500 }),
      headers: { ...authHeader, "Content-Type": "application/json" },
    })
    .reply(200, { id: cursorId, totalCount });

  pages.forEach((records, i) => {
    const isLast = i === pages.length - 1;
    pool
      .intercept({
        path: "/k/v1/records/cursor.json",
        method: "GET",
        query: { id: cursorId },
        headers: authHeader,
      })
      .reply(200, { records, next: !isLast });
  });

  pool
    .intercept({
      path: "/k/v1/records/cursor.json",
      method: "DELETE",
      query: { id: cursorId },
      headers: authHeader,
    })
    .reply(200, {});

  return pages
    .flat()
    .map((r) => JSON.stringify(r) + "\n")
    .join("");
};

const KINTONE_ENV_KEYS = [
  "KINTONE_BASE_URL",
  "KINTONE_API_TOKEN",
  "KINTONE_USERNAME",
  "KINTONE_PASSWORD",
  "KINTONE_OAUTH_CLIENT_ID",
  "KINTONE_OAUTH_CLIENT_SECRET",
  "KINTONE_OAUTH_REFRESH_TOKEN",
] as const;

describe("cli integration", () => {
  let mockAgent: MockAgent;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    // Node 22 のビルトイン fetch は Node 同梱の undici を使うため、
    // 別パッケージである userland undici の setGlobalDispatcher が効かない。
    // undici.fetch に差し替えることで MockAgent が intercept できるようになる。
    vi.stubGlobal("fetch", undiciFetch);

    stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    // vitest が console をフックしており process.stderr.write とは別経路。
    // console.error を直接 spy することで resolveAuth の warning を捕捉する。
    consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    for (const key of KINTONE_ENV_KEYS) {
      vi.stubEnv(key, "");
    }
    vi.stubEnv("KINTONE_BASE_URL", BASE_URL);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await mockAgent.close();
  });

  const readStdout = (): string =>
    stdoutSpy.mock.calls.map((c) => String(c[0])).join("");
  const readStderr = (): string =>
    stderrSpy.mock.calls.map((c) => String(c[0])).join("");

  describe("record get", () => {
    it("case A: hits /k/v1/record.json with token-a", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token-a");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      pool
        .intercept({
          path: "/k/v1/record.json",
          method: "GET",
          query: { app: "1", id: "1" },
          headers: { "X-Cybozu-API-Token": "test-token-a" },
        })
        .reply(200, GET_FIXTURE);

      const code = await main([
        "node",
        "kt",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      const stderr = readStderr();
      expect(stderr, `stderr: ${stderr}`).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(GET_EXPECTED_STDOUT);
    });

    it("case B: --guest-space-id rewrites path and uses token-b", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token-b");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      pool
        .intercept({
          path: "/k/guest/5/v1/record.json",
          method: "GET",
          query: { app: "2", id: "2" },
          headers: { "X-Cybozu-API-Token": "test-token-b" },
        })
        .reply(200, GET_FIXTURE);

      const code = await main([
        "node",
        "kt",
        "record",
        "get",
        "--app",
        "2",
        "--id",
        "2",
        "--guest-space-id",
        "5",
      ]);

      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(GET_EXPECTED_STDOUT);
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it("error Layer A: 403 response → exit 1 + error body on stderr", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      // 公式仕様準拠: {id, code, message} の 3 フィールドのみ
      const errorBody = {
        id: "test-error-id",
        code: "CB_NO02",
        message: "No privilege to proceed.",
      };
      pool
        .intercept({
          path: "/k/v1/record.json",
          method: "GET",
          query: { app: "1", id: "1" },
          headers: { "X-Cybozu-API-Token": "test-token" },
        })
        .reply(403, errorBody);

      const code = await main([
        "node",
        "kt",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      expect(code).toBe(1);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe("");
      const stderr = readStderr();
      expect(stderr).toContain("CB_NO02");
      expect(stderr).toContain("No privilege to proceed.");
    });
  });

  describe("record add", () => {
    // JSON.stringify(JSON.parse(x)) is identity only for compact canonical JSON.
    // Using a compact input keeps the intercept body matcher deterministic.
    const INPUT_JSON = '{"app":1,"record":{"name":{"value":"Alice"}}}';
    const ADD_RESPONSE = { id: "100", revision: "1" };

    it("POST body: serializes --json, sends application/json, prints response", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      pool
        .intercept({
          path: "/k/v1/record.json",
          method: "POST",
          body: INPUT_JSON,
          headers: {
            "X-Cybozu-API-Token": "test-token",
            "Content-Type": "application/json",
          },
        })
        .reply(200, ADD_RESPONSE);

      const code = await main([
        "node",
        "kt",
        "record",
        "add",
        "--json",
        INPUT_JSON,
      ]);

      const stderr = readStderr();
      expect(stderr, `stderr: ${stderr}`).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(
        JSON.stringify(ADD_RESPONSE, undefined, 2) + "\n",
      );
    });

    it("--dry-run: no HTTP fire, outputs dry-run JSON", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      // Register no interceptors. disableNetConnect() is on, so any fetch
      // attempt would throw and propagate as exit 1. Passing with code 0
      // proves that --dry-run short-circuited before fetch.

      const code = await main([
        "node",
        "kt",
        "record",
        "add",
        "--json",
        INPUT_JSON,
        "--dry-run",
      ]);

      const stderr = readStderr();
      expect(stderr, `stderr: ${stderr}`).toBe("");
      expect(code).toBe(0);
      const expected =
        JSON.stringify(
          {
            dryRun: true,
            method: "POST",
            path: "/k/v1/record.json",
            body: JSON.parse(INPUT_JSON),
          },
          undefined,
          2,
        ) + "\n";
      expect(readStdout()).toBe(expected);
    });
  });

  describe("record update", () => {
    const UPDATE_JSON =
      '{"app":1,"id":1,"record":{"name":{"value":"NewName"}}}';
    const UPDATE_RESPONSE = { revision: "2" };

    it("PUT body: serializes --json and sends application/json", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      pool
        .intercept({
          path: "/k/v1/record.json",
          method: "PUT",
          body: UPDATE_JSON,
          headers: {
            "X-Cybozu-API-Token": "test-token",
            "Content-Type": "application/json",
          },
        })
        .reply(200, UPDATE_RESPONSE);

      const code = await main([
        "node",
        "kt",
        "record",
        "update",
        "--json",
        UPDATE_JSON,
      ]);

      const stderr = readStderr();
      expect(stderr, `stderr: ${stderr}`).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(
        JSON.stringify(UPDATE_RESPONSE, undefined, 2) + "\n",
      );
    });

    it("--dry-run: no HTTP fire, outputs dry-run JSON", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");

      const code = await main([
        "node",
        "kt",
        "record",
        "update",
        "--json",
        UPDATE_JSON,
        "--dry-run",
      ]);

      expect(readStderr()).toBe("");
      expect(code).toBe(0);
      const expected =
        JSON.stringify(
          {
            dryRun: true,
            method: "PUT",
            path: "/k/v1/record.json",
            body: JSON.parse(UPDATE_JSON),
          },
          undefined,
          2,
        ) + "\n";
      expect(readStdout()).toBe(expected);
    });
  });

  describe("records delete", () => {
    // DELETE /k/v1/records.json uses query-string encoded array params
    // (not a body). Exercises appendQueryParams' array encoding.
    const DELETE_JSON = '{"app":1,"ids":[1,2]}';

    it("DELETE: sends params as query string with array encoding", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      pool
        .intercept({
          path: "/k/v1/records.json",
          method: "DELETE",
          query: {
            app: "1",
            "ids[0]": "1",
            "ids[1]": "2",
          },
          headers: { "X-Cybozu-API-Token": "test-token" },
        })
        .reply(200, {});

      const code = await main([
        "node",
        "kt",
        "records",
        "delete",
        "--json",
        DELETE_JSON,
      ]);

      const stderr = readStderr();
      expect(stderr, `stderr: ${stderr}`).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe("{}\n");
    });

    it("--dry-run: no HTTP fire, outputs dry-run JSON with params", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");

      const code = await main([
        "node",
        "kt",
        "records",
        "delete",
        "--json",
        DELETE_JSON,
        "--dry-run",
      ]);

      expect(readStderr()).toBe("");
      expect(code).toBe(0);
      const expected =
        JSON.stringify(
          {
            dryRun: true,
            method: "DELETE",
            path: "/k/v1/records.json",
            params: JSON.parse(DELETE_JSON),
          },
          undefined,
          2,
        ) + "\n";
      expect(readStdout()).toBe(expected);
    });
  });

  describe("env errors", () => {
    it("missing KINTONE_BASE_URL → exit 1 with 'not set' message", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      vi.stubEnv("KINTONE_BASE_URL", ""); // override beforeEach

      const code = await main([
        "node",
        "kt",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      expect(code).toBe(1);
      expect(readStdout()).toBe("");
      expect(readStderr()).toContain("KINTONE_BASE_URL is not set");
    });

    it("no auth configured → exit 1 with guidance message", async () => {
      // beforeEach cleared all KINTONE_* auth vars to "".

      const code = await main([
        "node",
        "kt",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      expect(code).toBe(1);
      expect(readStdout()).toBe("");
      expect(readStderr()).toContain("No authentication configured");
    });

    it("fetch throws (unmatched request) → exit 1", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      // No interceptor registered. disableNetConnect() on MockAgent causes
      // any non-matched request to throw, simulating a network failure.

      const code = await main([
        "node",
        "kt",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      expect(code).toBe(1);
      expect(readStdout()).toBe("");
      expect(readStderr()).toMatch(/^Error:/);
    });
  });

  describe("auth variants", () => {
    // Test fixtures using CHANGEME (gitleaks-recognized placeholder).
    const TEST_USER = "CHANGEME";
    const TEST_PASS = "CHANGEME";
    const PASSWORD_AUTH_HEADER = Buffer.from(
      `${TEST_USER}:${TEST_PASS}`,
    ).toString("base64");

    it("password auth sends X-Cybozu-Authorization (Basic base64)", async () => {
      vi.stubEnv("KINTONE_USERNAME", TEST_USER);
      vi.stubEnv("KINTONE_PASSWORD", TEST_PASS);
      const pool = createValidatedPool(mockAgent, BASE_URL);
      pool
        .intercept({
          path: "/k/v1/record.json",
          method: "GET",
          query: { app: "1", id: "1" },
          headers: { "X-Cybozu-Authorization": PASSWORD_AUTH_HEADER },
        })
        .reply(200, GET_FIXTURE);

      const code = await main([
        "node",
        "kt",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      expect(readStderr()).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
    });

    it("--auth-type explicit selects one method without warning", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "token-value");
      vi.stubEnv("KINTONE_USERNAME", TEST_USER);
      vi.stubEnv("KINTONE_PASSWORD", TEST_PASS);
      const pool = createValidatedPool(mockAgent, BASE_URL);
      pool
        .intercept({
          path: "/k/v1/record.json",
          method: "GET",
          query: { app: "1", id: "1" },
          headers: { "X-Cybozu-Authorization": PASSWORD_AUTH_HEADER },
        })
        .reply(200, GET_FIXTURE);

      const code = await main([
        "node",
        "kt",
        "--auth-type",
        "password",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      expect(code).toBe(0);
      // explicit --auth-type suppresses the multi-detect warning
      expect(readStderr()).toBe("");
      mockAgent.assertNoPendingInterceptors();
    });

    it("multi-detect without --auth-type emits warning to stderr", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "token-value");
      vi.stubEnv("KINTONE_USERNAME", TEST_USER);
      vi.stubEnv("KINTONE_PASSWORD", TEST_PASS);
      const pool = createValidatedPool(mockAgent, BASE_URL);
      pool
        .intercept({
          path: "/k/v1/record.json",
          method: "GET",
          query: { app: "1", id: "1" },
          // api-token is first in detectAuthMethods order, so it wins
          headers: { "X-Cybozu-API-Token": "token-value" },
        })
        .reply(200, GET_FIXTURE);

      const code = await main([
        "node",
        "kt",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      const warnings = consoleErrSpy.mock.calls
        .map((c) => c.map(String).join(" "))
        .join("\n");
      expect(warnings).toContain("Multiple auth methods detected");
    });

    it("--auth-type oauth → exit 1 with 'not yet implemented' message", async () => {
      // OAuth env vars present so resolveAuth finds the method,
      // but buildAuthHeaders throws because OAuth is unimplemented.
      vi.stubEnv("KINTONE_OAUTH_CLIENT_ID", "CHANGEME");
      vi.stubEnv("KINTONE_OAUTH_CLIENT_SECRET", "CHANGEME");
      vi.stubEnv("KINTONE_OAUTH_REFRESH_TOKEN", "CHANGEME");

      const code = await main([
        "node",
        "kt",
        "--auth-type",
        "oauth",
        "record",
        "get",
        "--app",
        "1",
        "--id",
        "1",
      ]);

      expect(code).toBe(1);
      expect(readStdout()).toBe("");
      expect(readStderr()).toContain("OAuth is not yet implemented");
    });
  });

  describe("records get", () => {
    it("--fields: encodes comma list as fields[0]=...&fields[1]=...", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      const response = {
        records: [{ id: { value: "1" } }],
        totalCount: null,
      };
      pool
        .intercept({
          path: "/k/v1/records.json",
          method: "GET",
          query: {
            app: "1",
            "fields[0]": "name",
            "fields[1]": "status",
          },
          headers: { "X-Cybozu-API-Token": "test-token" },
        })
        .reply(200, response);

      const code = await main([
        "node",
        "kt",
        "records",
        "get",
        "--app",
        "1",
        "--fields",
        "name,status",
      ]);

      const stderr = readStderr();
      expect(stderr, `stderr: ${stderr}`).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(JSON.stringify(response, undefined, 2) + "\n");
    });

    it("--page-all: single-page cursor emits NDJSON", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      const records = [
        { id: { value: "1" }, name: { value: "Alice" } },
        { id: { value: "2" }, name: { value: "Bob" } },
      ];
      const expectedStdout = mockCursorSequence({
        pool,
        app: 1,
        cursorId: "cursor-single",
        pages: [records],
        authHeader: { "X-Cybozu-API-Token": "test-token" },
      });

      const code = await main([
        "node",
        "kt",
        "records",
        "get",
        "--app",
        "1",
        "--page-all",
      ]);

      expect(readStderr()).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(expectedStdout);
    });

    it("--page-all: multi-page cursor paginates and emits NDJSON in order", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      const page1 = [{ id: { value: "1" } }, { id: { value: "2" } }];
      const page2 = [{ id: { value: "3" } }];
      const expectedStdout = mockCursorSequence({
        pool,
        app: 1,
        cursorId: "cursor-multi",
        pages: [page1, page2],
        authHeader: { "X-Cybozu-API-Token": "test-token" },
      });

      const code = await main([
        "node",
        "kt",
        "records",
        "get",
        "--app",
        "1",
        "--page-all",
      ]);

      expect(readStderr()).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(expectedStdout);
    });
  });

  describe("records add", () => {
    it("POST /k/v1/records.json with body", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      const INPUT_JSON = '{"app":1,"records":[{"name":{"value":"Alice"}}]}';
      const RESPONSE = { ids: ["100"], revisions: ["1"] };
      pool
        .intercept({
          path: "/k/v1/records.json",
          method: "POST",
          body: INPUT_JSON,
          headers: {
            "X-Cybozu-API-Token": "test-token",
            "Content-Type": "application/json",
          },
        })
        .reply(200, RESPONSE);

      const code = await main([
        "node",
        "kt",
        "records",
        "add",
        "--json",
        INPUT_JSON,
      ]);

      expect(readStderr()).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(JSON.stringify(RESPONSE, undefined, 2) + "\n");
    });
  });

  describe("records update", () => {
    it("PUT /k/v1/records.json with body", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      const INPUT_JSON =
        '{"app":1,"records":[{"id":1,"record":{"name":{"value":"Updated"}}}]}';
      const RESPONSE = { records: [{ id: "1", revision: "2" }] };
      pool
        .intercept({
          path: "/k/v1/records.json",
          method: "PUT",
          body: INPUT_JSON,
          headers: {
            "X-Cybozu-API-Token": "test-token",
            "Content-Type": "application/json",
          },
        })
        .reply(200, RESPONSE);

      const code = await main([
        "node",
        "kt",
        "records",
        "update",
        "--json",
        INPUT_JSON,
      ]);

      expect(readStderr()).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStdout()).toBe(JSON.stringify(RESPONSE, undefined, 2) + "\n");
    });
  });

  describe("noGuestSpace guard", () => {
    it("plugins get --guest-space-id → exit 1 'not supported' message", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      // No interceptor registered. The guard throws before any fetch call.

      const code = await main([
        "node",
        "kt",
        "--guest-space-id",
        "5",
        "plugins",
        "get",
      ]);

      expect(code).toBe(1);
      expect(readStdout()).toBe("");
      expect(readStderr()).toContain("--guest-space-id is not supported");
      expect(readStderr()).toContain("plugins get");
    });
  });

  describe("--json validation", () => {
    it("invalid payload (missing required) → exit 1, JSON on stderr, no API call", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      // No interceptor; disableNetConnect ensures any fetch attempt would fail.

      const code = await main(["node", "kt", "record", "add", "--json", "{}"]);

      expect(code).toBe(1);
      expect(readStdout()).toBe("");
      const stderr = readStderr();
      // 1 行に集約された JSON
      const lines = stderr.trim().split("\n");
      expect(lines).toHaveLength(1);
      const parsed = JSON.parse(lines[0]);
      expect(parsed.error).toBe("json_validation_failed");
      expect(parsed.method).toBe("POST");
      expect(parsed.path).toBe("/k/v1/record.json");
      expect(Array.isArray(parsed.errors)).toBe(true);
      expect(
        parsed.errors.some(
          (e: { keyword: string; params: { missingProperty?: string } }) =>
            e.keyword === "required" && e.params.missingProperty === "app",
        ),
      ).toBe(true);
    });

    it("typo in top-level key surfaces additionalProperty name", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");

      const code = await main([
        "node",
        "kt",
        "record",
        "add",
        "--json",
        '{"app":1,"rcord":{}}',
      ]);

      expect(code).toBe(1);
      const parsed = JSON.parse(readStderr().trim());
      expect(
        parsed.errors.some(
          (e: { keyword: string; params: { additionalProperty?: string } }) =>
            e.keyword === "additionalProperties" &&
            e.params.additionalProperty === "rcord",
        ),
      ).toBe(true);
    });

    it("--dry-run still validates; invalid → exit 1", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");

      const code = await main([
        "node",
        "kt",
        "record",
        "add",
        "--json",
        "{}",
        "--dry-run",
      ]);

      expect(code).toBe(1);
      expect(readStdout()).toBe("");
      const parsed = JSON.parse(readStderr().trim());
      expect(parsed.error).toBe("json_validation_failed");
    });

    it("--skip-validation: invalid payload still hits API (with stderr notice)", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      // 仕様逸脱の payload を実際に送信できることを確認
      const SKIP_BODY = '{"app":1,"record":{}}';
      pool
        .intercept({
          path: "/k/v1/record.json",
          method: "POST",
          body: SKIP_BODY,
          headers: {
            "X-Cybozu-API-Token": "test-token",
            "Content-Type": "application/json",
          },
        })
        .reply(200, { id: "1", revision: "1" });

      const code = await main([
        "node",
        "kt",
        "record",
        "add",
        "--json",
        SKIP_BODY,
        "--skip-validation",
      ]);

      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
      expect(readStderr()).toContain("--skip-validation is in effect");
    });

    it("--schema short-circuits before validation runs (no validation error for empty json)", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");

      const code = await main(["node", "kt", "record", "add", "--schema"]);

      expect(code).toBe(0);
      // schema が出ているはず
      expect(readStdout()).toContain('"path":"/k/v1/record.json"');
      expect(readStderr()).toBe("");
    });

    it("records delete: invalid query payload → exit 1 with json_validation_failed", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");

      const code = await main([
        "node",
        "kt",
        "records",
        "delete",
        "--json",
        '{"app":1,"ids":"10,11"}',
      ]);

      expect(code).toBe(1);
      const parsed = JSON.parse(readStderr().trim());
      expect(parsed.error).toBe("json_validation_failed");
      expect(parsed.method).toBe("DELETE");
      expect(parsed.path).toBe("/k/v1/records.json");
    });

    it("bulk-request: requests wrap structure passes validation", async () => {
      vi.stubEnv("KINTONE_API_TOKEN", "test-token");
      const pool = createValidatedPool(mockAgent, BASE_URL);
      const BULK_BODY = JSON.stringify({
        requests: [
          {
            method: "POST",
            api: "/k/v1/record.json",
            payload: { app: 1, record: { 名前: { value: "x" } } },
          },
        ],
      });
      pool
        .intercept({
          path: "/k/v1/bulkRequest.json",
          method: "POST",
          body: BULK_BODY,
          headers: {
            "X-Cybozu-API-Token": "test-token",
            "Content-Type": "application/json",
          },
        })
        .reply(200, { results: [{ id: "1", revision: "1" }] });

      const code = await main([
        "node",
        "kt",
        "bulk-request",
        "add",
        "--json",
        BULK_BODY,
      ]);

      expect(readStderr()).toBe("");
      expect(code).toBe(0);
      mockAgent.assertNoPendingInterceptors();
    });
  });
});
