// Covers assertRequestMatchesSpec itself so downstream integration tests
// can trust it as a stable gate.

import { describe, expect, it } from "vitest";
import { assertRequestMatchesSpec } from "./spec-validator.js";

describe("assertRequestMatchesSpec", () => {
  describe("GET /k/v1/record.json (query params)", () => {
    it("passes for valid query", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/record.json",
          method: "GET",
          query: { app: "1", id: "1" },
        }),
      ).not.toThrow();
    });

    it("throws on missing required (app)", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/record.json",
          method: "GET",
          query: { id: "1" },
        }),
      ).toThrow(/required property 'app'/);
    });

    it("throws on type mismatch (app = 'abc')", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/record.json",
          method: "GET",
          query: { app: "abc", id: "1" },
        }),
      ).toThrow(/must be integer/);
    });

    it("throws on extra field (injected additionalProperties:false)", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/record.json",
          method: "GET",
          query: { app: "1", id: "1", foo: "extra" },
        }),
      ).toThrow(/additional|foo/i);
    });
  });

  describe("GET /k/v1/records.json (array-encoded query)", () => {
    it("un-expands fields[0]=.../fields[1]=... back into the fields array", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/records.json",
          method: "GET",
          query: {
            app: "1",
            "fields[0]": "name",
            "fields[1]": "status",
          },
        }),
      ).not.toThrow();
    });
  });

  describe("POST /k/v1/record.json (JSON body)", () => {
    it("passes for valid body", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/record.json",
          method: "POST",
          body: { app: 1, record: {} },
        }),
      ).not.toThrow();
    });

    it("accepts body as a JSON string (intercept convention)", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/record.json",
          method: "POST",
          body: '{"app":1,"record":{}}',
        }),
      ).not.toThrow();
    });

    it("throws on missing required (record)", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/record.json",
          method: "POST",
          body: { app: 1 },
        }),
      ).toThrow(/required property 'record'/);
    });

    it("throws on extra top-level field (additionalProperties:false injected)", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/record.json",
          method: "POST",
          body: { app: 1, record: {}, wrong: "x" },
        }),
      ).toThrow(/additional|wrong/i);
    });
  });

  describe("guest-space path", () => {
    it("resolves /k/guest/<id>/v1/... against the templated spec entry", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/guest/5/v1/record.json",
          method: "GET",
          query: { app: "1", id: "1" },
        }),
      ).not.toThrow();
    });
  });

  describe("unknown endpoint", () => {
    it("throws a descriptive error", () => {
      expect(() =>
        assertRequestMatchesSpec({
          path: "/k/v1/nonexistent.json",
          method: "GET",
        }),
      ).toThrow(/spec has no GET \/k\/v1\/nonexistent.json/);
    });
  });
});
