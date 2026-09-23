import { readFileSync } from "node:fs";
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

describe("bundled spec provenance", () => {
  // NOTE: build-spec.mjs が刻む x-kintone-cli-provenance を検査する。同梱元を
  // kintone/openapi-spec (MIT-0) に切り替えた後、定数の更新漏れで誤ったライセンスが
  // dist/spec.json に記録されたまま公開される事故を防ぐ。
  const provenance = (
    JSON.parse(readFileSync(new URL("./spec.json", import.meta.url), "utf8")) as {
      "x-kintone-cli-provenance": { origin: string; license: string; upstreamVersion: string };
    }
  )["x-kintone-cli-provenance"];

  it("records origin kintone/openapi-spec and license MIT-0", () => {
    expect(provenance.origin).toBe("https://github.com/kintone/openapi-spec");
    expect(provenance.license).toBe("MIT-0");
  });

  it("records the upstream info.version of tag v1", () => {
    expect(provenance.upstreamVersion).toBe("2026.8.31");
  });
});

describe("spec shape after migration to kintone/openapi-spec", () => {
  it("DELETE /k/v1/records.json defines a JSON requestBody instead of query parameters", () => {
    const { operation } = getEndpointSchema("DELETE", "/k/v1/records.json");
    expect(operation).toHaveProperty("requestBody");
    const queryParams = ((operation.parameters as Array<{ in: string }> | undefined) ?? []).filter(
      (p) => p.in === "query",
    );
    expect(queryParams).toEqual([]);
  });

  it("PUT space/guests exists only under the guest-space path", () => {
    expect(() => getEndpointSchema("PUT", "/k/v1/space/guests.json")).toThrow(
      /spec has no path \/k\/v1\/space\/guests\.json/,
    );
    expect(() =>
      getEndpointSchema("PUT", "/k/guest/{guestSpaceId}/v1/space/guests.json"),
    ).not.toThrow();
  });
});
