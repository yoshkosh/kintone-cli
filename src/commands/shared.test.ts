import { describe, expect, it } from "vitest";
import { CommanderError } from "commander";
import { requireOpts, toGuestSpaceId } from "./shared.js";

describe("toGuestSpaceId", () => {
  it("returns undefined when guestSpaceId is not present", () => {
    expect(toGuestSpaceId({})).toBeUndefined();
  });

  it("converts a string guestSpaceId to a number", () => {
    const result = toGuestSpaceId({ guestSpaceId: "5" });
    expect(result).toBe(5);
    expect(typeof result).toBe("number");
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
