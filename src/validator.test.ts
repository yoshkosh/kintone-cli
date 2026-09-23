import { describe, expect, it, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { attachEndpoint } from "./endpoint-registry.js";
import {
  JsonValidationError,
  compileForBulkSub,
  compileForEndpoint,
  validateJsonOrThrow,
} from "./validator.js";

const makeCmd = (method: "GET" | "POST" | "PUT" | "DELETE", path: string): Command => {
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
    const extra = thrown?.entries.find((e) => e.keyword === "additionalProperties");
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
    expect(() => validateJsonOrThrow(cmd, {}, { app: "1", record: {} })).not.toThrow();
  });

  it('"app": "abc" fails for integer (coerce impossible)', () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    expect(() => validateJsonOrThrow(cmd, {}, { app: "abc", record: {} })).toThrow(
      JsonValidationError,
    );
  });
});

describe("validateJsonOrThrow (DELETE requestBody)", () => {
  // NOTE: kintone/openapi-spec は DELETE のパラメータを requestBody で定義するため、
  // records delete の --json も他の書き込み系と同じ body モードで検証する。
  it("passes { app, ids: [...] } for DELETE /k/v1/records.json", () => {
    const cmd = makeCmd("DELETE", "/k/v1/records.json");
    expect(() => validateJsonOrThrow(cmd, {}, { app: 1, ids: [1, 2] })).not.toThrow();
  });

  it('rejects "ids": "10,11" (string instead of array)', () => {
    const cmd = makeCmd("DELETE", "/k/v1/records.json");
    expect(() => validateJsonOrThrow(cmd, {}, { app: 1, ids: "10,11" })).toThrow(
      JsonValidationError,
    );
  });

  it("flags an unknown top-level key (idz) with additionalProperties", () => {
    const cmd = makeCmd("DELETE", "/k/v1/records.json");
    let thrown: JsonValidationError | undefined;
    try {
      validateJsonOrThrow(cmd, {}, { app: 1, ids: [1], idz: [2] });
    } catch (e) {
      thrown = e as JsonValidationError;
    }
    expect(thrown).toBeInstanceOf(JsonValidationError);
    const extra = thrown?.entries.find((e) => e.keyword === "additionalProperties");
    expect(extra?.params.additionalProperty).toBe("idz");
  });
});

describe("validateJsonOrThrow --skip-validation", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  it("does not throw for invalid payload when skipValidation=true", () => {
    const cmd = makeCmd("POST", "/k/v1/record.json");
    expect(() => validateJsonOrThrow(cmd, { skipValidation: true }, {})).not.toThrow();
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
    const a = compileForEndpoint("POST", "/k/v1/record.json");
    const b = compileForEndpoint("POST", "/k/v1/record.json");
    expect(a).toBe(b);
  });

  it("uses separate compilation per (method, path)", () => {
    const post = compileForEndpoint("POST", "/k/v1/record.json");
    const del = compileForEndpoint("DELETE", "/k/v1/records.json");
    expect(post).not.toBe(del);
  });

  it("throws a descriptive error for an endpoint without a JSON requestBody", () => {
    expect(() => compileForEndpoint("GET", "/k/v1/record.json")).toThrow(
      /no JSON requestBody for GET \/k\/v1\/record\.json/,
    );
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

describe("validateJsonOrThrow bulkRequest sub-payload (X2)", () => {
  const bulkCmd = (): Command => makeCmd("POST", "/k/v1/bulkRequest.json");

  const runBulk = (body: unknown): JsonValidationError | undefined => {
    try {
      validateJsonOrThrow(bulkCmd(), {}, body);
      return undefined;
    } catch (e) {
      return e as JsonValidationError;
    }
  };

  it("C1: detects missing 'app' in POST /k/v1/record.json sub-payload", () => {
    const err = runBulk({
      requests: [
        {
          method: "POST",
          api: "/k/v1/record.json",
          payload: { record: {} },
        },
      ],
    });
    expect(err).toBeInstanceOf(JsonValidationError);
    const required = err?.entries.find(
      (e) => e.keyword === "required" && e.params.missingProperty === "app",
    );
    expect(required).toBeDefined();
    expect(required?.instancePath).toBe("/requests/0/payload");
  });

  it("C2: DELETE /k/v1/records.json with 'record' surfaces both extra and missing", () => {
    const err = runBulk({
      requests: [
        {
          method: "DELETE",
          api: "/k/v1/records.json",
          payload: { app: 1, record: { 名前: { value: "x" } } },
        },
      ],
    });
    expect(err).toBeInstanceOf(JsonValidationError);
    const missingIds = err?.entries.find(
      (e) => e.keyword === "required" && e.params.missingProperty === "ids",
    );
    expect(missingIds).toBeDefined();
    const extraRecord = err?.entries.find(
      (e) => e.keyword === "additionalProperties" && e.params.additionalProperty === "record",
    );
    expect(extraRecord).toBeDefined();
  });

  it("C3: all 8 (method, api) combinations pass with minimal valid payload", () => {
    const cases: Array<{ method: string; api: string; payload: unknown }> = [
      {
        method: "POST",
        api: "/k/v1/record.json",
        payload: { app: 1, record: {} },
      },
      {
        method: "PUT",
        api: "/k/v1/record.json",
        payload: { app: 1, record: {} },
      },
      {
        method: "PUT",
        api: "/k/v1/record/status.json",
        payload: { app: 1, action: "Process", id: 100 },
      },
      {
        method: "PUT",
        api: "/k/v1/record/assignees.json",
        payload: { app: 1, assignees: ["user1"], id: 100 },
      },
      {
        method: "DELETE",
        api: "/k/v1/records.json",
        payload: { app: 1, ids: [1] },
      },
      {
        method: "POST",
        api: "/k/v1/records.json",
        payload: { app: 1, records: [{}] },
      },
      {
        method: "PUT",
        api: "/k/v1/records.json",
        payload: { app: 1, records: [{ record: {} }] },
      },
      {
        method: "PUT",
        api: "/k/v1/records/status.json",
        payload: { app: 1, records: [{ action: "Process", id: 100 }] },
      },
    ];
    const err = runBulk({ requests: cases });
    expect(err).toBeUndefined();
  });

  it("C4: unknown (method, api) is reported with bulkRequestUnknownSubapi (and payload {} is reachable)", () => {
    const err = runBulk({
      requests: [
        {
          method: "POST",
          api: "/k/v1/space/members.json",
          payload: {},
        },
      ],
    });
    expect(err).toBeInstanceOf(JsonValidationError);
    const unknown = err?.entries.find((e) => e.keyword === "bulkRequestUnknownSubapi");
    expect(unknown).toBeDefined();
    expect(unknown?.instancePath).toBe("/requests/0");
    expect(unknown?.params.method).toBe("POST");
    expect(unknown?.params.api).toBe("/k/v1/space/members.json");
  });

  it("C5: lower-case method is rejected as unknown subapi", () => {
    const err = runBulk({
      requests: [
        {
          method: "post",
          api: "/k/v1/record.json",
          payload: { app: 1, record: {} },
        },
      ],
    });
    expect(err).toBeInstanceOf(JsonValidationError);
    const unknown = err?.entries.find((e) => e.keyword === "bulkRequestUnknownSubapi");
    expect(unknown).toBeDefined();
    expect(unknown?.params.method).toBe("post");
  });

  it("C6: only the violating index is reported when multiple requests are present", () => {
    const err = runBulk({
      requests: [
        {
          method: "POST",
          api: "/k/v1/record.json",
          payload: { app: 1, record: {} },
        },
        {
          method: "POST",
          api: "/k/v1/record.json",
          payload: { record: {} },
        },
      ],
    });
    expect(err).toBeInstanceOf(JsonValidationError);
    const paths = err?.entries.map((e) => e.instancePath) ?? [];
    expect(paths.every((p) => p.startsWith("/requests/1"))).toBe(true);
    expect(paths.some((p) => p.startsWith("/requests/0"))).toBe(false);
  });

  it("C7: entry-level extra property (e.g. 'comment') is rejected at /requests/0", () => {
    const err = runBulk({
      requests: [
        {
          method: "POST",
          api: "/k/v1/record.json",
          payload: { app: 1, record: {} },
          comment: "memo",
        },
      ],
    });
    expect(err).toBeInstanceOf(JsonValidationError);
    const extra = err?.entries.find(
      (e) => e.keyword === "additionalProperties" && e.params.additionalProperty === "comment",
    );
    expect(extra).toBeDefined();
    expect(extra?.instancePath).toBe("/requests/0");
  });

  it("C8: compileForBulkSub returns the same compiled validator on repeat calls (cache)", () => {
    const a = compileForBulkSub("BulkRequestPostRecordPostForm");
    const b = compileForBulkSub("BulkRequestPostRecordPostForm");
    expect(a).toBe(b);
  });

  it("C9: coerce boundary - payload.app as string '1' passes, body is not mutated", () => {
    const body = {
      requests: [
        {
          method: "POST",
          api: "/k/v1/record.json",
          payload: { app: "1", record: {} },
        },
      ],
    };
    expect(() => validateJsonOrThrow(bulkCmd(), {}, body)).not.toThrow();
    expect(body.requests[0].payload.app).toBe("1");
  });

  it("C10: instancePath prefixes are simple-concat for both root and nested violations", () => {
    const err = runBulk({
      requests: [
        // root-level required missing → instancePath = /requests/0/payload
        {
          method: "POST",
          api: "/k/v1/record.json",
          payload: { record: {} },
        },
        // nested type mismatch on .records (must be array) → /requests/1/payload/records
        {
          method: "POST",
          api: "/k/v1/records.json",
          payload: { app: 1, records: { not: "an-array" } },
        },
      ],
    });
    expect(err).toBeInstanceOf(JsonValidationError);
    expect(err?.entries.some((e) => e.instancePath === "/requests/0/payload")).toBe(true);
    expect(err?.entries.some((e) => e.instancePath === "/requests/1/payload/records")).toBe(true);
  });
});
