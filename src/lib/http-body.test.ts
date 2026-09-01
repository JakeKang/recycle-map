import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { readJsonBody } from "@/lib/http-body";

describe("JSON request body", () => {
  it("rejects a streamed body that exceeds the configured limit", async () => {
    const request = new NextRequest("http://localhost/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(64 * 1024) }),
    });

    const result = await readJsonBody(request);

    expect(result).toEqual({
      ok: false,
      message: "요청 본문이 너무 큽니다.",
    });
  });
});
