// Test-only helper. Validates MockAgent.intercept() arguments against the
// kintone OpenAPI Spec so a typo in the test expectation (wrong param name,
// missing required field, wrong type, unknown extra field) fails fast with
// a descriptive error rather than passing as a "green" test that is secretly
// wrong.
//
// Scope: request-side contract only (query params + JSON body). Response
// validation is out of scope — fixtures are authored to match what the CLI
// will receive; the CLI's code then parses that.

import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import Ajv, { type ValidateFunction } from "ajv";

const SPEC_PATH = path.resolve(
  process.cwd(),
  "third_party/rest-api-spec/openapi.yaml",
);

type JsonObject = Record<string, unknown>;

const spec = parse(readFileSync(SPEC_PATH, "utf8")) as {
  paths: Record<string, Record<string, unknown>>;
  components?: { schemas?: Record<string, unknown> };
};

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  coerceTypes: true,
  // kintone spec uses non-standard `format` values ("long", "date-time",
  // "boolean", "number", "query"). Suppress ajv's "unknown format ignored"
  // warnings; the `type` keyword still enforces the underlying check.
  logger: false,
});

for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
  ajv.addSchema(schema as object, `#/components/schemas/${name}`);
}

const validatorCache = new Map<string, ValidateFunction>();

// Guest-space paths (/k/guest/<id>/v1/...) share their schema with the
// base (/k/v1/...) version in the bundled spec, but are listed under a
// templated path key. Normalize to that template form for lookup.
const normalizePathForSpec = (p: string): string => {
  const match = p.match(/^\/k\/guest\/(\d+)\/(.*)$/);
  if (match) return `/k/guest/{guestSpaceId}/${match[2]}`;
  return p;
};

type EndpointDef = {
  parameters?: Array<{
    in: string;
    name: string;
    required?: boolean;
    schema: object;
  }>;
  requestBody?: {
    content?: { "application/json"?: { schema?: object } };
  };
};

const resolveEndpoint = (
  p: string,
  method: string,
): EndpointDef | undefined => {
  const methodKey = method.toLowerCase();
  const tryPath = (candidate: string): EndpointDef | undefined => {
    const pathObj = spec.paths[candidate];
    if (!pathObj) return undefined;
    return pathObj[methodKey] as EndpointDef | undefined;
  };
  return tryPath(p) ?? tryPath(normalizePathForSpec(p));
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

const buildQuerySchema = (parameters: EndpointDef["parameters"]): object => {
  const queryParams = (parameters ?? []).filter((p) => p.in === "query");
  const properties: JsonObject = {};
  const required: string[] = [];
  for (const p of queryParams) {
    properties[p.name] = p.schema;
    if (p.required) required.push(p.name);
  }
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
};

// Inject additionalProperties: false at the top level only, so extra
// top-level fields are rejected while the kintone `record` object (which
// holds user-defined field codes under additionalProperties.anyOf) stays
// permissive as intended.
const tightenTopLevel = (schema: object): object => {
  const s = schema as JsonObject;
  if (s.type === "object" && s.additionalProperties === undefined) {
    return { ...s, additionalProperties: false };
  }
  return schema;
};

const getOrCompile = (schema: object, cacheKey: string): ValidateFunction => {
  const cached = validatorCache.get(cacheKey);
  if (cached) return cached;
  const compiled = ajv.compile(schema);
  validatorCache.set(cacheKey, compiled);
  return compiled;
};

const formatErrors = (errors: ValidateFunction["errors"]): string => {
  if (!errors) return "(no error details)";
  return errors.map((e) => `${e.instancePath || "/"}: ${e.message}`).join("; ");
};

export type RequestMatch = {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  query?: JsonObject;
  body?: unknown;
};

export const assertRequestMatchesSpec = (match: RequestMatch): void => {
  const endpoint = resolveEndpoint(match.path, match.method);
  if (!endpoint) {
    throw new Error(
      `spec has no ${match.method} ${match.path} (nor guest-space template)`,
    );
  }

  if (match.query !== undefined) {
    const querySchema = buildQuerySchema(endpoint.parameters);
    const validate = getOrCompile(
      querySchema,
      `query:${match.method}:${match.path}`,
    );
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
    const bodySchema =
      endpoint.requestBody?.content?.["application/json"]?.schema;
    if (!bodySchema) {
      throw new Error(
        `spec has no JSON requestBody for ${match.method} ${match.path}`,
      );
    }
    const tightened = tightenTopLevel(bodySchema);
    const validate = getOrCompile(
      tightened,
      `body:${match.method}:${match.path}`,
    );
    const bodyJson: unknown =
      typeof match.body === "string" ? JSON.parse(match.body) : match.body;
    const data = structuredClone(bodyJson);
    if (!validate(data)) {
      throw new Error(
        `Body violates spec for ${match.method} ${match.path}: ${formatErrors(validate.errors)}`,
      );
    }
  }
};
