import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetch as undiciFetch, MockAgent, setGlobalDispatcher } from "undici";
import { main } from "./cli.js";

const FIXTURE = { record: { name: { value: "test" } } };
const EXPECTED_STDOUT = JSON.stringify(FIXTURE, undefined, 2) + "\n";
const BASE_URL = "https://example.cybozu.com";

const KINTONE_ENV_KEYS = [
  "KINTONE_BASE_URL",
  "KINTONE_API_TOKEN",
  "KINTONE_USERNAME",
  "KINTONE_PASSWORD",
  "KINTONE_OAUTH_CLIENT_ID",
  "KINTONE_OAUTH_CLIENT_SECRET",
  "KINTONE_OAUTH_REFRESH_TOKEN",
] as const;

describe("cli integration: record get", () => {
  let mockAgent: MockAgent;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

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

    // Clear every auth env var so each case starts from a known baseline.
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

  it("case A: hits /k/v1/record.json with token-a", async () => {
    vi.stubEnv("KINTONE_API_TOKEN", "test-token-a");
    const pool = mockAgent.get(BASE_URL);
    pool
      .intercept({
        path: "/k/v1/record.json",
        method: "GET",
        query: { app: "1", id: "1" },
        headers: { "X-Cybozu-API-Token": "test-token-a" },
      })
      .reply(200, FIXTURE);

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

    const stderr = stderrSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(stderr, `stderr: ${stderr}`).toBe("");
    expect(code).toBe(0);
    mockAgent.assertNoPendingInterceptors();
    const stdout = stdoutSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(stdout).toBe(EXPECTED_STDOUT);
  });

  it("case B: --guest-space-id rewrites path and uses token-b", async () => {
    vi.stubEnv("KINTONE_API_TOKEN", "test-token-b");
    const pool = mockAgent.get(BASE_URL);
    pool
      .intercept({
        path: "/k/guest/5/v1/record.json",
        method: "GET",
        query: { app: "2", id: "2" },
        headers: { "X-Cybozu-API-Token": "test-token-b" },
      })
      .reply(200, FIXTURE);

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
    const stdout = stdoutSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(stdout).toBe(EXPECTED_STDOUT);
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});
