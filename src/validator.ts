import type { Command, OptionValues } from "commander";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import {
  getComponentSchemas,
  getEndpointSchema,
  type HttpMethod,
} from "./spec.js";
import { getEndpointMeta } from "./endpoint-registry.js";

type AjvInstance = InstanceType<typeof Ajv>;

export type ValidationMode = "body" | "query";

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

let ajvInstance: AjvInstance | undefined;

const getAjv = (): AjvInstance => {
  if (ajvInstance) return ajvInstance;
  ajvInstance = new Ajv({
    strict: false,
    allErrors: true,
    coerceTypes: true,
    // NOTE: kintone spec は "long" / "date-time" / "boolean" / "number" / "query" 等
    // の非標準 format 値を多用する。`logger: false` はこれらに対する ajv の
    // "unknown format ignored" 警告抑制であって format 検証ではない。
    // type キーワードのみが効く。
    logger: false,
  });
  for (const [name, schema] of Object.entries(getComponentSchemas())) {
    ajvInstance.addSchema(schema as object, `#/components/schemas/${name}`);
  }
  return ajvInstance;
};

const validatorCache = new Map<string, ValidateFunction>();

// NOTE: 余分なトップレベルプロパティを検出するため、トップレベルだけ
// additionalProperties: false を注入する。kintone の record オブジェクトは
// ユーザー定義 field code を additionalProperties.anyOf で許容しているため
// 内部までは厳密化しない。spec 側が明示している場合はそちらを尊重する。
const tightenTopLevel = (schema: object): object => {
  const s = schema as Record<string, unknown>;
  if (s.type === "object" && s.additionalProperties === undefined) {
    return { ...s, additionalProperties: false };
  }
  return schema;
};

const buildQuerySchema = (parameters: EndpointDef["parameters"]): object => {
  const queryParams = (parameters ?? []).filter((p) => p.in === "query");
  const properties: Record<string, unknown> = {};
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

export const compileForEndpoint = (
  method: HttpMethod,
  path: string,
  mode: ValidationMode,
): ValidateFunction => {
  const cacheKey = `${mode}:${method}:${path}`;
  const cached = validatorCache.get(cacheKey);
  if (cached) return cached;

  const { operation } = getEndpointSchema(method, path);
  const def = operation as EndpointDef;

  let schema: object;
  if (mode === "query") {
    schema = buildQuerySchema(def.parameters);
  } else {
    const bodySchema = def.requestBody?.content?.["application/json"]?.schema;
    if (!bodySchema) {
      throw new Error(`spec has no JSON requestBody for ${method} ${path}`);
    }
    schema = tightenTopLevel(bodySchema);
  }

  const compiled = getAjv().compile(schema);
  validatorCache.set(cacheKey, compiled);
  return compiled;
};

export type JsonValidationErrorEntry = {
  instancePath: string;
  keyword: string;
  message: string | undefined;
  params: Record<string, unknown>;
};

export class JsonValidationError extends Error {
  readonly method: HttpMethod;
  readonly apiPath: string;
  readonly entries: JsonValidationErrorEntry[];
  constructor(
    method: HttpMethod,
    apiPath: string,
    errors: ErrorObject[] | null | undefined,
  ) {
    super("json_validation_failed");
    this.name = "JsonValidationError";
    this.method = method;
    this.apiPath = apiPath;
    this.entries = (errors ?? []).map((e) => ({
      instancePath: e.instancePath,
      keyword: e.keyword,
      message: e.message,
      params: e.params as Record<string, unknown>,
    }));
  }

  toPayload(): Record<string, unknown> {
    return {
      error: "json_validation_failed",
      method: this.method,
      path: this.apiPath,
      errors: this.entries,
    };
  }
}

const SKIP_NOTICE =
  "Notice: --skip-validation is in effect; payload not validated against OpenAPI Spec.\n";

export const validateJsonOrThrow = (
  cmd: Command,
  opts: OptionValues,
  body: unknown,
  options?: { mode?: ValidationMode },
): void => {
  if (opts.skipValidation) {
    process.stderr.write(SKIP_NOTICE);
    return;
  }
  const meta = getEndpointMeta(cmd);
  if (!meta) {
    throw new Error(
      "validateJsonOrThrow: command has no endpoint meta (attachEndpoint missing?)",
    );
  }
  const mode = options?.mode ?? "body";
  const validate = compileForEndpoint(meta.method, meta.path, mode);
  // NOTE: coerceTypes は data を mutate するため、検証は clone 上で行う。
  // 実送信 payload (引数の body) は補正せず原型のまま kintoneRequest に渡す。
  const data = structuredClone(body);
  if (!validate(data)) {
    throw new JsonValidationError(meta.method, meta.path, validate.errors);
  }
};
