import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SPEC_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "spec.json",
);

type JsonObject = Record<string, unknown>;
type Operation = JsonObject;
type PathItem = Record<string, Operation>;
type Spec = {
  paths: Record<string, PathItem>;
  components?: { schemas?: JsonObject };
};

let cached: Spec | undefined;

const loadSpec = (): Spec => {
  if (!cached) {
    cached = JSON.parse(readFileSync(SPEC_PATH, "utf8")) as Spec;
  }
  return cached;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type EndpointSchema = {
  method: HttpMethod;
  path: string;
  operation: Operation;
};

export const getEndpointSchema = (
  method: HttpMethod,
  apiPath: string,
): EndpointSchema => {
  const spec = loadSpec();
  const pathItem = spec.paths[apiPath];
  if (!pathItem) {
    throw new Error(`spec has no path ${apiPath}`);
  }
  const operation = pathItem[method.toLowerCase()];
  if (!operation) {
    throw new Error(`spec has no ${method} ${apiPath}`);
  }
  return { method, path: apiPath, operation };
};

export const getComponentSchemas = (): Record<string, unknown> => {
  const spec = loadSpec();
  return (spec.components?.schemas ?? {}) as Record<string, unknown>;
};
