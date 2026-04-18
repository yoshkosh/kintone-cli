import { describe, expect, it } from "vitest";
import { buildPath } from "./client.js";

describe("buildPath", () => {
  it("returns the input path unchanged when guestSpaceId is undefined", () => {
    expect(buildPath("/k/v1/record.json")).toBe("/k/v1/record.json");
  });

  it("rewrites /k/v1/ to /k/guest/<id>/v1/ when guestSpaceId is given", () => {
    expect(buildPath("/k/v1/record.json", 5)).toBe("/k/guest/5/v1/record.json");
  });
});
