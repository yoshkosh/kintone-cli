// kintone OpenAPI Spec の厳密度実証プローブ。
// 3 エンドポイント × 3 種類の「意図的に壊したリクエスト」を ajv に流し、
// どこまで検出できるかを確認する。
//
// 実行: node experiment/spec-probe.mjs

import { readFileSync } from "node:fs";
import { parse } from "yaml";
import Ajv from "ajv";

const SPEC_PATH = "./third_party/rest-api-spec/openapi.yaml";

const spec = parse(readFileSync(SPEC_PATH, "utf8"));

const buildQuerySchema = (parameters) => {
  const queryParams = parameters.filter((p) => p.in === "query");
  const properties = {};
  const required = [];
  for (const p of queryParams) {
    properties[p.name] = p.schema;
    if (p.required) required.push(p.name);
  }
  return { type: "object", properties, required };
};

const paths = spec.paths;

const schemas = {
  "GET /k/v1/record.json": buildQuerySchema(
    paths["/k/v1/record.json"].get.parameters,
  ),
  "GET /k/v1/records.json": buildQuerySchema(
    paths["/k/v1/records.json"].get.parameters,
  ),
  "POST /k/v1/record.json":
    paths["/k/v1/record.json"].post.requestBody.content["application/json"]
      .schema,
};

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  coerceTypes: true,
});

for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
  ajv.addSchema(schema, `#/components/schemas/${name}`);
}

const probes = [
  {
    endpoint: "GET /k/v1/record.json",
    axis: "extra field",
    data: { app: 1, id: 1, foo: "extra" },
  },
  {
    endpoint: "GET /k/v1/record.json",
    axis: "missing required",
    data: { id: 1 },
  },
  {
    endpoint: "GET /k/v1/record.json",
    axis: "type mismatch",
    data: { app: "abc", id: 1 },
  },
  {
    endpoint: "GET /k/v1/records.json",
    axis: "extra field",
    data: { app: 1, bogus: "x" },
  },
  {
    endpoint: "GET /k/v1/records.json",
    axis: "missing required",
    data: { fields: ["a"] },
  },
  {
    endpoint: "GET /k/v1/records.json",
    axis: "type mismatch",
    data: { app: 1, totalCount: "yes" },
  },
  {
    endpoint: "POST /k/v1/record.json",
    axis: "extra field",
    data: { app: 1, record: {}, wrong: "x" },
  },
  {
    endpoint: "POST /k/v1/record.json",
    axis: "missing required",
    data: { app: 1 },
  },
  {
    endpoint: "POST /k/v1/record.json",
    axis: "type mismatch",
    data: { app: "abc", record: {} },
  },
];

let detected = 0;
const lines = [];
for (const probe of probes) {
  const schema = schemas[probe.endpoint];
  const validate = ajv.compile(schema);
  // Note: validate may mutate data when coerceTypes is on; clone first.
  const dataCopy = JSON.parse(JSON.stringify(probe.data));
  const valid = validate(dataCopy);
  const wasDetected = !valid;
  if (wasDetected) detected += 1;
  const mark = wasDetected ? "✓" : "✗";
  const suffix = wasDetected ? "" : "  ← PASSED AS VALID";
  lines.push(`${mark} ${probe.endpoint} [${probe.axis}]${suffix}`);
  if (wasDetected && validate.errors) {
    for (const e of validate.errors) {
      lines.push(`    ${e.instancePath || "/"}: ${e.message}`);
    }
  }
}

console.log("\n=== Spec strictness probe ===\n");
for (const line of lines) console.log(line);
console.log(`\nDetection rate: ${detected} / ${probes.length}`);
