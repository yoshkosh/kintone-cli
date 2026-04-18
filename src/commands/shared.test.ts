import { describe, expect, it } from "vitest";
import { toGuestSpaceId } from "./shared.js";

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
