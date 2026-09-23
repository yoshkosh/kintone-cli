import type { Command, OptionValues } from "commander";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import { getComponentSchemas, getEndpointSchema, type HttpMethod } from "./spec.js";
import { getEndpointMeta } from "./endpoint-registry.js";
import { resolveBulkSubSchema } from "./bulk-request-schemas.js";

type AjvInstance = InstanceType<typeof Ajv>;

type EndpointDef = {
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

// NOTE: kintone/openapi-spec は DELETE を含む全書き込み系を requestBody で定義するため、
// 実行時の検証は requestBody だけを対象にする。GET の query 検証はテストヘルパー
// (src/__test-helpers__/spec-validator.ts) の責務で、実行時コードには持ち込まない。
export const compileForEndpoint = (method: HttpMethod, path: string): ValidateFunction => {
  const cacheKey = `${method}:${path}`;
  const cached = validatorCache.get(cacheKey);
  if (cached) return cached;

  const { operation } = getEndpointSchema(method, path);
  const def = operation as EndpointDef;
  const bodySchema = def.requestBody?.content?.["application/json"]?.schema;
  if (!bodySchema) {
    throw new Error(`spec has no JSON requestBody for ${method} ${path}`);
  }
  // NOTE: addSchema 済オブジェクトを直接 tighten すると mutate になるため clone 経由にする。
  const schema = tightenTopLevel(structuredClone(bodySchema));

  const compiled = getAjv().compile(schema);
  validatorCache.set(cacheKey, compiled);
  return compiled;
};

// NOTE: bulkRequest 二段検証の sub-schema コンパイラ。getComponentSchemas() から取り出した
// 本体は ajv.addSchema 済オブジェクトと同一参照のため、clone してから tighten / compile する
// (元の addSchema 経由の $ref 解決を壊さないため)。`bulk:${name}` でキャッシュ。
export const compileForBulkSub = (subSchemaName: string): ValidateFunction => {
  const cacheKey = `bulk:${subSchemaName}`;
  const cached = validatorCache.get(cacheKey);
  if (cached) return cached;

  const raw = getComponentSchemas()[subSchemaName];
  if (!raw) {
    throw new Error(`spec has no component schema ${subSchemaName}`);
  }
  const tightened = tightenTopLevel(structuredClone(raw) as object);
  const compiled = getAjv().compile(tightened);
  validatorCache.set(cacheKey, compiled);
  return compiled;
};

// NOTE: bulkRequest トップレベル schema を「外形のみ」に弱める。payload の anyOf を外して
// `{ type: "object" }` に縮め、`requests[]` 各 item に additionalProperties: false を注入する
// (entry レベルの余分プロパティ検出のため)。payload 内容検証は二段目に全委譲する (X2)。
// items は元 spec で `$ref: BulkRequestPostRequestForm` のため、対応コンポーネントも clone 経由で
// インライン展開する (元の addSchema 済オブジェクトを mutate しない)。
export const compileForBulkTop = (): ValidateFunction => {
  const cacheKey = "bulk:top";
  const cached = validatorCache.get(cacheKey);
  if (cached) return cached;

  const { operation } = getEndpointSchema("POST", "/k/v1/bulkRequest.json");
  const def = operation as EndpointDef;
  const bodySchema = def.requestBody?.content?.["application/json"]?.schema;
  if (!bodySchema) {
    throw new Error("spec has no JSON requestBody for bulkRequest");
  }
  const cloned = structuredClone(bodySchema) as Record<string, unknown>;

  const components = getComponentSchemas();
  const requestForm = structuredClone(components.BulkRequestPostRequestForm) as Record<
    string,
    unknown
  >;
  const formProps = requestForm.properties as Record<string, unknown>;
  formProps.payload = { type: "object" };
  requestForm.additionalProperties = false;

  const props = cloned.properties as Record<string, unknown>;
  const requests = props.requests as Record<string, unknown>;
  requests.items = requestForm;

  const tightened = tightenTopLevel(cloned);
  const compiled = getAjv().compile(tightened);
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
  constructor(method: HttpMethod, apiPath: string, errors: ErrorObject[] | null | undefined) {
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

  // NOTE: bulkRequest 二段検証のように、ajv の ErrorObject[] ではなく自前で組み立てた
  // JsonValidationErrorEntry[] (top + sub の合算) から例外を作るための static factory。
  static fromEntries(
    method: HttpMethod,
    apiPath: string,
    entries: JsonValidationErrorEntry[],
  ): JsonValidationError {
    const err = new JsonValidationError(method, apiPath, null);
    err.entries.push(...entries);
    return err;
  }
}

// NOTE: bulkRequest の二段目検証。requests[] を走査し、各 entry の (method, api) から
// sub-schema を引いて payload を個別検証する。トップレベル外形が崩れている場合 (`requests`
// が array でない、要素が object でない、method/api が string でない) は該当エントリを
// スキップする (top の検証で別途エラーが立っている)。
const validateBulkRequestSubPayloads = (data: unknown): JsonValidationErrorEntry[] => {
  const entries: JsonValidationErrorEntry[] = [];
  if (!data || typeof data !== "object") return entries;
  const requests = (data as Record<string, unknown>).requests;
  if (!Array.isArray(requests)) return entries;

  for (let i = 0; i < requests.length; i++) {
    const item = requests[i];
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const method = r.method;
    const api = r.api;
    if (typeof method !== "string" || typeof api !== "string") continue;

    const subSchemaName = resolveBulkSubSchema(method, api);
    if (!subSchemaName) {
      entries.push({
        instancePath: `/requests/${i}`,
        keyword: "bulkRequestUnknownSubapi",
        message: `no sub-schema for ${method} ${api}`,
        params: { method, api },
      });
      continue;
    }

    const validate = compileForBulkSub(subSchemaName);
    if (!validate(r.payload)) {
      for (const e of validate.errors ?? []) {
        entries.push({
          // NOTE: ajv instancePath は空文字 or `/...` 形式。空なら `/requests/i/payload`、
          // ネストなら `/requests/i/payload/record/...` の単純連結で JSON Pointer 規約を満たす。
          instancePath: `/requests/${i}/payload${e.instancePath}`,
          keyword: e.keyword,
          message: e.message,
          params: e.params as Record<string, unknown>,
        });
      }
    }
  }
  return entries;
};

const SKIP_NOTICE =
  "Notice: --skip-validation is in effect; payload not validated against OpenAPI Spec.\n";

export const validateJsonOrThrow = (cmd: Command, opts: OptionValues, body: unknown): void => {
  if (opts.skipValidation) {
    process.stderr.write(SKIP_NOTICE);
    return;
  }
  const meta = getEndpointMeta(cmd);
  if (!meta) {
    throw new Error("validateJsonOrThrow: command has no endpoint meta (attachEndpoint missing?)");
  }

  // NOTE: bulkRequest だけは X2 (トップ schema 加工 + 二段目全委譲) で検証する。
  // 詳細は reports/bulk-request-validation-plan.md §設計判断 A 参照。
  if (meta.method === "POST" && meta.path === "/k/v1/bulkRequest.json") {
    const data = structuredClone(body);
    const entries: JsonValidationErrorEntry[] = [];
    const topValidate = compileForBulkTop();
    if (!topValidate(data)) {
      for (const e of topValidate.errors ?? []) {
        entries.push({
          instancePath: e.instancePath,
          keyword: e.keyword,
          message: e.message,
          params: e.params as Record<string, unknown>,
        });
      }
    }
    // NOTE: 外形違反があっても二段目は走らせる。ただし requests が array でない等で
    // 物理的に走れない場合は validateBulkRequestSubPayloads 内でスキップする。
    entries.push(...validateBulkRequestSubPayloads(data));
    if (entries.length > 0) {
      throw JsonValidationError.fromEntries(meta.method, meta.path, entries);
    }
    return;
  }

  const validate = compileForEndpoint(meta.method, meta.path);
  // NOTE: coerceTypes は data を mutate するため、検証は clone 上で行う。
  // 実送信 payload (引数の body) は補正せず原型のまま kintoneRequest に渡す。
  const data = structuredClone(body);
  if (!validate(data)) {
    throw new JsonValidationError(meta.method, meta.path, validate.errors);
  }
};
