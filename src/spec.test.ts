import { describe, expect, it } from "vitest";
import { getEndpointSchema } from "./spec.js";

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
