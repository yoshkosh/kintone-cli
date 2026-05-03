// bulkRequest 内部 sub-schema の厳密度実証プローブ。
// `BulkRequestPostRequestForm.payload.anyOf` に列挙された 8 sub-schema を、
// `tightenTopLevel` 注入後に ajv に流して、意図的に壊した payload の検出力を測定する。
//
// 実行: node experiment/bulk-request-spec-probe.mjs
//
// 参考: experiment/spec-probe.mjs (Phase 4.2 着手前の同種プローブ)

import { readFileSync } from "node:fs";
import { parse } from "yaml";
import Ajv from "ajv";

const SPEC_PATH = "./third_party/rest-api-spec/openapi.yaml";

const spec = parse(readFileSync(SPEC_PATH, "utf8"));

// production と同じ tightenTopLevel ロジック (src/validator.ts:52)。
const tightenTopLevel = (schema) => {
  if (
    schema &&
    typeof schema === "object" &&
    schema.type === "object" &&
    schema.additionalProperties === undefined
  ) {
    return { ...schema, additionalProperties: false };
  }
  return schema;
};

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  coerceTypes: true,
  logger: false,
});

const components = spec.components?.schemas ?? {};
for (const [name, schema] of Object.entries(components)) {
  ajv.addSchema(schema, `#/components/schemas/${name}`);
}

// (method, api) → sub-schema 名 (8 種)。
// 計画書 §スコープ §対象ペイロード より。
const SUB_SCHEMAS = [
  {
    method: "POST",
    api: "/k/v1/record.json",
    name: "BulkRequestPostRecordPostForm",
  },
  {
    method: "PUT",
    api: "/k/v1/record.json",
    name: "BulkRequestPostRecordPutForm",
  },
  {
    method: "PUT",
    api: "/k/v1/record/status.json",
    name: "BulkRequestPostRecordStatusPutForm",
  },
  {
    method: "PUT",
    api: "/k/v1/record/assignees.json",
    name: "BulkRequestPostRecordAssigneesPutForm",
  },
  {
    method: "DELETE",
    api: "/k/v1/records.json",
    name: "BulkRequestPostRecordsDeleteForm",
  },
  {
    method: "POST",
    api: "/k/v1/records.json",
    name: "BulkRequestPostRecordsPostForm",
  },
  {
    method: "PUT",
    api: "/k/v1/records.json",
    name: "BulkRequestPostRecordsPutForm",
  },
  {
    method: "PUT",
    api: "/k/v1/records/status.json",
    name: "BulkRequestPostRecordsStatusPutForm",
  },
];

// 各 sub-schema 用のプローブセット。
// baseline は「正しい minimal payload」(全 8 種でこれが pass しないと probe 自体がバグ)。
// missing/type/extra の 3 軸 × 8 sub-schema = 24 broken probe + 8 baseline。
const PROBES = {
  BulkRequestPostRecordPostForm: {
    baseline: { app: 1, record: {} },
    missing: { app: 1 },
    type: { app: "abc", record: {} },
    extra: { app: 1, record: {}, foo: "x" },
  },
  BulkRequestPostRecordPutForm: {
    // NOTE: spec の required は app のみ。id/updateKey の二者択一は spec に表現されていない (計画書 §スコープ外)。
    baseline: { app: 1, record: {} },
    missing: { record: {} },
    type: { app: "abc", record: {} },
    extra: { app: 1, record: {}, foo: "x" },
  },
  BulkRequestPostRecordStatusPutForm: {
    baseline: { app: 1, action: "Process", id: 100 },
    missing: { app: 1, action: "Process" },
    type: { app: "abc", action: "Process", id: 100 },
    extra: { app: 1, action: "Process", id: 100, foo: "x" },
  },
  BulkRequestPostRecordAssigneesPutForm: {
    baseline: { app: 1, assignees: ["user1"], id: 100 },
    missing: { app: 1, id: 100 },
    type: { app: 1, assignees: ["user1"], id: "abc" },
    extra: { app: 1, assignees: ["user1"], id: 100, foo: "x" },
  },
  BulkRequestPostRecordsDeleteForm: {
    baseline: { app: 1, ids: [100] },
    missing: { app: 1 },
    type: { app: 1, ids: "100" },
    extra: { app: 1, ids: [100], foo: "x" },
  },
  BulkRequestPostRecordsPostForm: {
    baseline: { app: 1, records: [{}] },
    missing: { app: 1 },
    type: { app: 1, records: "not-an-array" },
    extra: { app: 1, records: [{}], foo: "x" },
  },
  BulkRequestPostRecordsPutForm: {
    baseline: { app: 1, records: [{ record: {} }] },
    missing: { app: 1 },
    type: { app: 1, records: "not-an-array" },
    extra: { app: 1, records: [{ record: {} }], foo: "x" },
  },
  BulkRequestPostRecordsStatusPutForm: {
    baseline: { app: 1, records: [{ action: "Process", id: 100 }] },
    missing: { app: 1 },
    type: { app: 1, records: "not-an-array" },
    extra: { app: 1, records: [{ action: "Process", id: 100 }], foo: "x" },
  },
};

const lines = [];
const tally = {
  baseline: { total: 0, pass: 0 },
  missing: { total: 0, detected: 0 },
  type: { total: 0, detected: 0 },
  extra: { total: 0, detected: 0 },
};

for (const { method, api, name } of SUB_SCHEMAS) {
  const raw = components[name];
  if (!raw) {
    lines.push(`!! ${name} not found in spec components`);
    continue;
  }
  // production と同じく clone してから tightenTopLevel 適用 → 裸の schema として compile。
  const cloned = structuredClone(raw);
  const tightened = tightenTopLevel(cloned);
  const validate = ajv.compile(tightened);

  lines.push(`\n--- ${method} ${api}  (${name}) ---`);
  const probes = PROBES[name];

  // baseline (valid minimal payload)。
  {
    const data = structuredClone(probes.baseline);
    const valid = validate(data);
    tally.baseline.total += 1;
    if (valid) tally.baseline.pass += 1;
    lines.push(
      `  baseline    ${valid ? "✓ valid" : "✗ FAILED (probe bug?)"}`,
    );
    if (!valid && validate.errors) {
      for (const e of validate.errors) {
        lines.push(`    ${e.instancePath || "/"}: ${e.message}`);
      }
    }
  }
  // 3 軸の broken probe。
  for (const axis of /** @type {const} */ (["missing", "type", "extra"])) {
    const data = structuredClone(probes[axis]);
    const valid = validate(data);
    const detected = !valid;
    tally[axis].total += 1;
    if (detected) tally[axis].detected += 1;
    const mark = detected ? "✓" : "✗";
    const suffix = detected ? "" : "  ← PASSED AS VALID";
    lines.push(`  ${axis.padEnd(11)}${mark} ${suffix}`);
    if (detected && validate.errors) {
      for (const e of validate.errors) {
        lines.push(`    ${e.instancePath || "/"}: ${e.message}`);
      }
    }
  }
}

console.log("\n=== bulkRequest sub-schema strictness probe ===");
for (const line of lines) console.log(line);
console.log("\n=== summary ===");
console.log(
  `  baseline pass : ${tally.baseline.pass} / ${tally.baseline.total}`,
);
console.log(
  `  missing detect: ${tally.missing.detected} / ${tally.missing.total}`,
);
console.log(`  type detect   : ${tally.type.detected} / ${tally.type.total}`);
console.log(`  extra detect  : ${tally.extra.detected} / ${tally.extra.total}`);
const totalDetected =
  tally.missing.detected + tally.type.detected + tally.extra.detected;
const totalProbes = tally.missing.total + tally.type.total + tally.extra.total;
console.log(`  overall       : ${totalDetected} / ${totalProbes}`);
