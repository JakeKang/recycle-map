import { extractErrorMessage, formatValidationIssues } from "@/lib/api-error";
import { z } from "zod";
import { describe, expect, it } from "vitest";

describe("api-error helpers", () => {
  it("extractErrorMessage handles string and issue arrays", () => {
    expect(extractErrorMessage({ message: "단일 메시지" }, "fallback")).toBe("단일 메시지");

    expect(
      extractErrorMessage(
        { message: [{ message: "title: 최소 2자" }, { message: "lat: 범위 오류" }] },
        "fallback",
      ),
    ).toBe("title: 최소 2자; lat: 범위 오류");

    expect(extractErrorMessage({ message: 123 }, "fallback")).toBe("fallback");
  });

  it("formatValidationIssues converts zod issues into readable message", () => {
    const schema = z.object({
      title: z.string().min(2),
      lat: z.number().min(33),
    });

    const parsed = schema.safeParse({ title: "x", lat: 1 });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const message = formatValidationIssues(parsed.error.issues);
    expect(message).toContain("title");
    expect(message).toContain("lat");
  });
});
