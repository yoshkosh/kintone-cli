import { describe, expect, it, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { attachEndpoint } from "./endpoint-registry.js";
import {
  JsonValidationError,
  compileForEndpoint,
  validateJsonOrThrow,
} from "./validator.js";

const makeCmd = (
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
): Command => {
  const cmd = new Command("dummy");
  attachEndpoint(cmd, { method, path });
  return cmd;
};

describe("validateJsonOrThrow (body mode)", () => {
  it("passes a known-good payload", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    expect(() =>
      validateJsonOrThrow(
        cmd,
        {},
        {
          app: 1,
          record: { 名前: { value: "田中" } },
        },
      ),
    ).not.toThrow();
  });

  it("flags missing required property with params.missingProperty", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    let thrown: JsonValidationError | undefined;
    try {
      validateJsonOrThrow(cmd, {}, { record: {} });
    } catch (e) {
      thrown = e as JsonValidationError;
    }
    expect(thrown).toBeInstanceOf(JsonValidationError);
    const required = thrown?.entries.find((e) => e.keyword === "required");
    expect(required).toBeDefined();
    expect(required?.params.missingProperty).toBe("app");
  });

  it("flags additionalProperties at top level with offending key", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    let thrown: JsonValidationError | undefined;
    try {
      validateJsonOrThrow(cmd, {}, { app: 1, record: {}, rcord: {} });
    } catch (e) {
      thrown = e as JsonValidationError;
    }
    expect(thrown).toBeInstanceOf(JsonValidationError);
    const extra = thrown?.entries.find(
      (e) => e.keyword === "additionalProperties",
    );
    expect(extra).toBeDefined();
    expect(extra?.params.additionalProperty).toBe("rcord");
  });

  it("does NOT flag user-defined field codes nested in record", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    expect(() =>
      validateJsonOrThrow(
        cmd,
        {},
        {
          app: 1,
          record: { カスタムフィールド名: { value: "x" } },
        },
      ),
    ).not.toThrow();
  });

  it("toPayload() returns canonical JSON shape", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    let thrown: JsonValidationError | undefined;
    try {
      validateJsonOrThrow(cmd, {}, {});
    } catch (e) {
      thrown = e as JsonValidationError;
    }
    const payload = thrown?.toPayload() as {
      error: string;
      method: string;
      path: string;
      errors: unknown[];
    };
    expect(payload.error).toBe("json_validation_failed");
    expect(payload.method).toBe("POST");
    expect(payload.path).toBe("/k/v1/record.json");
    expect(Array.isArray(payload.errors)).toBe(true);
  });
});

describe("validateJsonOrThrow coerce boundary", () => {
  it('"app": "1" passes for integer (string→number coerce)', () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    expect(() =>
      validateJsonOrThrow(cmd, {}, { app: "1", record: {} }),
    ).not.toThrow();
  });

  it('"app": "abc" fails for integer (coerce impossible)', () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    expect(() =>
      validateJsonOrThrow(cmd, {}, { app: "abc", record: {} }),
    ).toThrow(JsonValidationError);
  });
});

describe("validateJsonOrThrow (query mode for DELETE)", () => {
  it("passes JSON.parse-shaped { app, ids: [...] } without un-expansion", () => {
    const cmd = makeCmd("DELETE", "/k/v1/records.json");
    expect(() =>
      validateJsonOrThrow(cmd, {}, { app: 1, ids: [1, 2] }, { mode: "query" }),
    ).not.toThrow();
  });

  it('rejects "ids": "10,11" (string instead of array)', () => {
    const cmd = makeCmd("DELETE", "/k/v1/records.json");
    expect(() =>
      validateJsonOrThrow(cmd, {}, { app: 1, ids: "10,11" }, { mode: "query" }),
    ).toThrow(JsonValidationError);
  });
});

describe("validateJsonOrThrow --skip-validation", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  it("does not throw for invalid payload when skipValidation=true", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    expect(() =>
      validateJsonOrThrow(cmd, { skipValidation: true }, {}),
    ).not.toThrow();
  });

  it("emits a stderr notice when skipValidation=true", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    validateJsonOrThrow(cmd, { skipValidation: true }, {});
    const out = stderrSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(out).toContain("--skip-validation is in effect");
  });
});

describe("validateJsonOrThrow no endpoint meta", () => {
  it("throws a descriptive error when attachEndpoint was not called", () => {
    const cmd = new Command("dummy");
    expect(() => validateJsonOrThrow(cmd, {}, {})).toThrow(/endpoint meta/);
  });
});

describe("compileForEndpoint cache", () => {
  it("returns the same compiled validator on repeat calls", () => {
    const a = compileForEndpoint("POST", "/k/v1/record.json", "body");
    const b = compileForEndpoint("POST", "/k/v1/record.json", "body");
    expect(a).toBe(b);
  });

  it("uses separate compilation per (mode, method, path)", () => {
    const body = compileForEndpoint("POST", "/k/v1/record.json", "body");
    const query = compileForEndpoint("DELETE", "/k/v1/records.json", "query");
    expect(body).not.toBe(query);
  });
});

describe("validateJsonOrThrow does not mutate the input body", () => {
  it("preserves original string types after coerce-on-clone", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    const body: Record<string, unknown> = { app: "1", record: {} };
    validateJsonOrThrow(cmd, {}, body);
    // 元の app は文字列のまま (kintone は文字列でも受容するため CLI で書き換えない)
    expect(body.app).toBe("1");
  });
});
