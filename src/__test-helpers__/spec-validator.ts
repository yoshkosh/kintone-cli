// Test-only helper. Validates MockAgent.intercept() arguments against the
// kintone OpenAPI Spec so a typo in the test expectation (wrong param name,
// missing required field, wrong type, unknown extra field) fails fast with
// a descriptive error rather than passing as a "green" test that is secretly
// wrong.
//
// Scope: request-side contract only (query params + JSON body). Response
// validation is out of scope — fixtures are authored to match what the CLI
// will receive; the CLI's code then parses that.
//
// Runtime body / DELETE-query validation is implemented in src/validator.ts
// and reused here. test-helper-only concerns kept locally:
//   - guest path normalization (/k/guest/<id>/v1/...) — runtime sees the
//     pre-rewrite /k/v1/... path, but MockAgent intercept sees the rewritten
//     URL.
//   - `ids[0]=1&ids[1]=2` array-encoded query un-expansion — runtime feeds
//     the parsed object directly; the test-helper sees the post-serializer
//     query map.
//   - GET-query contract checking — out of runtime scope but desirable here.

import type { ValidateFunction } from "ajv";
import { compileForEndpoint } from "../validator.js";
import { getEndpointSchema, type HttpMethod } from "../spec.js";

type JsonObject = Record<string, unknown>;

// Guest-space paths (/k/guest/<id>/v1/...) share their schema with the
// base (/k/v1/...) version in the bundled spec, but are listed under a
// templated path key. Normalize to that template form for lookup.
const normalizePathForSpec = (p: string): string => {
  const match = p.match(/^\/k\/guest\/(\d+)\/(.*)$/);
  if (match) return `/k/guest/{guestSpaceId}/${match[2]}`;
  return p;
};

// Un-expand CLI's array-encoded query keys back to real arrays.
// Example: { "ids[0]": "1", "ids[1]": "2" } → { ids: ["1", "2"] }
const unexpandArrayQuery = (query: JsonObject): JsonObject => {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^(.+)\[(\d+)\]$/);
    if (match) {
      const [, baseName, idxStr] = match;
      const idx = Number(idxStr);
      const arr = (result[baseName] as unknown[]) ?? [];
      arr[idx] = value;
      result[baseName] = arr;
    } else {
      result[key] = value;
    }
  }
  return result;
};

const formatErrors = (errors: ValidateFunction["errors"]): string => {
  if (!errors) return "(no error details)";
  return errors.map((e) => `${e.instancePath || "/"}: ${e.message}`).join("; ");
};

export type RequestMatch = {
  path: string;
  method: HttpMethod;
  query?: JsonObject;
  body?: unknown;
};

export const assertRequestMatchesSpec = (match: RequestMatch): void => {
  const normalizedPath = normalizePathForSpec(match.path);
  // 早期に「path/method 不在」を検出するため getEndpointSchema を先に呼ぶ
  // (compileForEndpoint も同経路だが、エラー文言を test-helper 文脈に保つ)
  try {
    getEndpointSchema(match.method, normalizedPath);
  } catch {
    throw new Error(`spec has no ${match.method} ${match.path} (nor guest-space template)`);
  }

  if (match.query !== undefined) {
    const validate = compileForEndpoint(match.method, normalizedPath, "query");
    const unexpanded = unexpandArrayQuery(match.query);
    // coerceTypes mutates; feed a clone.
    const data = structuredClone(unexpanded);
    if (!validate(data)) {
      throw new Error(
        `Query violates spec for ${match.method} ${match.path}: ${formatErrors(validate.errors)}`,
      );
    }
  }

  if (match.body !== undefined) {
    const validate = compileForEndpoint(match.method, normalizedPath, "body");
    const bodyJson: unknown = typeof match.body === "string" ? JSON.parse(match.body) : match.body;
    const data = structuredClone(bodyJson);
    if (!validate(data)) {
      throw new Error(
        `Body violates spec for ${match.method} ${match.path}: ${formatErrors(validate.errors)}`,
      );
    }
  }
};
