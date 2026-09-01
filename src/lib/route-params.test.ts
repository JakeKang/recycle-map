import { describe, expect, it } from "vitest";

import { isUuidParam } from "@/lib/route-params";

describe("route parameters", () => {
  it("accepts UUIDs and rejects malformed database identifiers", () => {
    expect(isUuidParam("b1570f7a-4192-4c0d-8265-b4d1300a58ac")).toBe(true);
    expect(isUuidParam("not-a-uuid")).toBe(false);
    expect(isUuidParam("' or true --")).toBe(false);
  });
});
