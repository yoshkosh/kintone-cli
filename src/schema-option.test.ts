import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetch as undiciFetch, MockAgent, setGlobalDispatcher } from "undici";
import type { Command } from "commander";
import { main, createProgram } from "./cli.js";

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

const collectSchemaCommands = (root: Command): Command[] => {
  const result: Command[] = [];
  const walk = (c: Command): void => {
    if (c.options.some((o) => o.long === "--schema")) result.push(c);
    c.commands.forEach(walk);
  };
  walk(root);
  return result;
};

describe("--schema option", () => {
  let mockAgent: MockAgent;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    vi.stubGlobal("fetch", undiciFetch);

    stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

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

  it("emits schema for record get and exits 0", async () => {
    const code = await main([
      "node",
      "kt",
      "record",
      "get",
      "--app",
      "1",
      "--id",
      "1",
      "--schema",
    ]);

    expect(readStderr()).toBe("");
    expect(code).toBe(0);
    const parsed = JSON.parse(readStdout());
    expect(parsed.method).toBe("GET");
    expect(parsed.path).toBe("/k/v1/record.json");
    expect(parsed.operation).toBeDefined();
  });

  it("works without required options (validation skipped)", async () => {
    const code = await main(["node", "kt", "record", "get", "--schema"]);

    expect(readStderr()).toBe("");
    expect(code).toBe(0);
    const parsed = JSON.parse(readStdout());
    expect(parsed.path).toBe("/k/v1/record.json");
  });

  it("does not call the API (no interceptor needed)", async () => {
    // No interceptor + disableNetConnect: any actual fetch would error.
    const code = await main(["node", "kt", "record", "add", "--schema"]);

    expect(readStderr()).toBe("");
    expect(code).toBe(0);
    mockAgent.assertNoPendingInterceptors();
  });

  it("returns the non-guest path when --guest-space-id is set", async () => {
    const code = await main([
      "node",
      "kt",
      "record",
      "get",
      "--guest-space-id",
      "5",
      "--schema",
    ]);

    expect(code).toBe(0);
    const parsed = JSON.parse(readStdout());
    expect(parsed.path).toBe("/k/v1/record.json");
  });

  it("bypasses the noGuestSpace guard for plugins get", async () => {
    const code = await main([
      "node",
      "kt",
      "--guest-space-id",
      "5",
      "plugins",
      "get",
      "--schema",
    ]);

    expect(readStderr()).toBe("");
    expect(code).toBe(0);
    const parsed = JSON.parse(readStdout());
    expect(parsed.path).toBe("/k/v1/plugins.json");
  });

  it("when combined with --dry-run, emits only the schema (no dry-run output)", async () => {
    const code = await main([
      "node",
      "kt",
      "record",
      "add",
      "--json",
      '{"app":1,"record":{}}',
      "--dry-run",
      "--schema",
    ]);

    expect(code).toBe(0);
    const out = readStdout();
    expect(out).not.toContain("dryRun");
    const parsed = JSON.parse(out);
    expect(parsed.method).toBe("POST");
    expect(parsed.path).toBe("/k/v1/record.json");
  });

  it("emits compact JSON terminated by a single newline", async () => {
    await main(["node", "kt", "record", "get", "--schema"]);
    const out = readStdout();
    expect(out.endsWith("\n")).toBe(true);
    expect(out.split("\n").filter(Boolean)).toHaveLength(1);
    // Compact JSON has no spaces after commas/colons inside the structure.
    expect(out).not.toMatch(/^\{\s/);
  });

  it("attaches --schema to a non-trivial number of commands", () => {
    const program = createProgram();
    const commands = collectSchemaCommands(program);
    // 53 commands attach an endpoint as of this implementation
    // (record/records/comment/comments/status/preview/file/app/apps/acl
    // /app-settings/app-plugins/space/plugin/plugins/bulk-request/statistics).
    // Use a soft lower bound so harmless additions don't break the test.
    expect(commands.length).toBeGreaterThanOrEqual(50);
  });
});
