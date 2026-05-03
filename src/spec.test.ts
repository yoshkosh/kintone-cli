import { describe, expect, it } from "vitest";
import { getComponentSchemas, getEndpointSchema } from "./spec.js";
import { BULK_SUB_API_MAP } from "./bulk-request-schemas.js";

describe("getEndpointSchema", () => {
  it("returns method/path/operation for a known endpoint", () => {
    const result = getEndpointSchema("GET", "/k/v1/record.json");
    expect(result.method).toBe("GET");
    expect(result.path).toBe("/k/v1/record.json");
    expect(result.operation).toBeDefined();
    expect(result.operation).toHaveProperty("parameters");
  });

  it("includes requestBody for POST endpoints", () => {
    const result = getEndpointSchema("POST", "/k/v1/record.json");
    expect(result.operation).toHaveProperty("requestBody");
  });

  it("throws a descriptive error for an unknown path", () => {
    expect(() => getEndpointSchema("GET", "/k/v1/__nope__.json")).toThrow(
      /spec has no path \/k\/v1\/__nope__\.json/,
    );
  });

  it("throws a descriptive error for an unknown method on a known path", () => {
    expect(() => getEndpointSchema("DELETE", "/k/v1/record.json")).toThrow(
      /spec has no DELETE \/k\/v1\/record\.json/,
    );
  });
});

describe("BULK_SUB_API_MAP consistency with spec", () => {
  // S1: spec の BulkRequestPostRequestForm.payload.anyOf に列挙された $ref 名と
  // BULK_SUB_API_MAP の値集合が完全一致すること (順序非依存)。spec が新 sub-schema を
  // 追加した瞬間、マップ更新漏れを検出できる。
  it("S1: anyOf $ref names equal BULK_SUB_API_MAP values", () => {
    const components = getComponentSchemas();
    const requestForm = components.BulkRequestPostRequestForm as {
      properties: { payload: { anyOf: Array<{ $ref: string }> } };
    };
    const refs = requestForm.properties.payload.anyOf.map((entry) => {
      const m = entry.$ref.match(/^#\/components\/schemas\/(.+)$/);
      if (!m) throw new Error(`unexpected $ref shape: ${entry.$ref}`);
      return m[1];
    });
    const refSet = new Set(refs);
    const mapValues = new Set(BULK_SUB_API_MAP.values());
    expect([...refSet].sort()).toEqual([...mapValues].sort());
  });

  // S2: Map のキー重複は後勝ちで黙って吸収されるため、Map.size と宣言エントリ数が
  // 一致するかを別途検査する。
  it("S2: BULK_SUB_API_MAP has no duplicate keys (size matches declared entries)", () => {
    // 計画書 §スコープ §対象ペイロード で 8 種と決まっている。
    expect(BULK_SUB_API_MAP.size).toBe(8);
  });
});
