import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CommanderError } from "commander";
import { parseJsonOption, requireOpts, toGuestSpaceId, toInteger } from "./shared.js";

describe("toGuestSpaceId", () => {
  it("returns undefined when guestSpaceId is not present", () => {
    expect(toGuestSpaceId({})).toBeUndefined();
  });

  it("converts a string guestSpaceId to a number", () => {
    const result = toGuestSpaceId({ guestSpaceId: "5" });
    expect(result).toBe(5);
    expect(typeof result).toBe("number");
  });

  // NOTE: 非数値や 0 は buildPath でパスが書き換えられず通常パスを呼んでしまうため、
  // 黙って無視せず fail fast にする。
  it("throws for a non-numeric guestSpaceId", () => {
    expect(() => toGuestSpaceId({ guestSpaceId: "abc" })).toThrow(
      /--guest-space-id must be a positive integer/,
    );
  });

  it("throws for 0", () => {
    expect(() => toGuestSpaceId({ guestSpaceId: "0" })).toThrow(/positive integer/);
  });
});

describe("toInteger", () => {
  it("converts a decimal string to a number", () => {
    expect(toInteger({ name: "app", value: "12" })).toBe(12);
  });

  it("accepts a negative value (kintone uses -1 for 'do not check revision')", () => {
    expect(toInteger({ name: "revision", value: "-1" })).toBe(-1);
  });

  it("throws a descriptive error for a non-numeric value instead of yielding NaN", () => {
    expect(() => toInteger({ name: "app", value: "abc" })).toThrow(/--app must be an integer/);
  });

  it("throws for an empty string instead of yielding 0", () => {
    expect(() => toInteger({ name: "id", value: "" })).toThrow(/--id must be an integer/);
  });
});

describe("requireOpts", () => {
  it("does nothing when all required options are present", () => {
    expect(() => requireOpts({ app: "1", id: "2" }, ["app", "id"])).not.toThrow();
  });

  it("throws CommanderError when a required option is missing", () => {
    let caught: unknown;
    try {
      requireOpts({ app: "1" }, ["app", "id"]);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(CommanderError);
    const err = caught as CommanderError;
    expect(err.code).toBe("commander.missingArgument");
    expect(err.exitCode).toBe(1);
    expect(err.message).toContain("--id");
  });

  it("skips validation when opts.schema is truthy", () => {
    expect(() => requireOpts({ schema: true }, ["app", "id"])).not.toThrow();
  });
});

describe("parseJsonOption", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "parse-json-option-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("parses inline JSON when value does not start with '@'", async () => {
    await expect(parseJsonOption('{"a":1}')).resolves.toEqual({ a: 1 });
  });

  it("reads JSON from file when value starts with '@'", async () => {
    const path = join(dir, "payload.json");
    await writeFile(path, '{"a":1}', "utf8");
    await expect(parseJsonOption(`@${path}`)).resolves.toEqual({ a: 1 });
  });

  it("rejects with file-not-found message when path does not exist", async () => {
    const path = join(dir, "missing.json");
    await expect(parseJsonOption(`@${path}`)).rejects.toThrow(
      `--json @path: file not found: ${path}`,
    );
  });

  it("rejects with empty-path message when value is just '@'", async () => {
    await expect(parseJsonOption("@")).rejects.toThrow("--json @path: empty path after '@'");
  });

  it("rejects with invalid-JSON message when file contains broken JSON", async () => {
    const path = join(dir, "bad.json");
    await writeFile(path, "{not json", "utf8");
    await expect(parseJsonOption(`@${path}`)).rejects.toThrow(
      `--json @path: invalid JSON in ${path}: `,
    );
  });

  it("propagates SyntaxError from JSON.parse when inline JSON is invalid", async () => {
    await expect(parseJsonOption("{not json")).rejects.toThrowError(SyntaxError);
  });

  it("treats '@' only as the first-character marker; payload-internal '@' passes through", async () => {
    await expect(parseJsonOption('{"x":"@y"}')).resolves.toEqual({ x: "@y" });
  });

  it("treats BOM-prefixed file content as invalid JSON (BOM is not stripped)", async () => {
    const path = join(dir, "bom.json");
    await writeFile(path, "﻿" + '{"a":1}', "utf8");
    await expect(parseJsonOption(`@${path}`)).rejects.toThrow(
      `--json @path: invalid JSON in ${path}: `,
    );
  });
});
