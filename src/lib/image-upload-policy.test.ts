import { describe, expect, it } from "vitest";

import { validateImageUploadBatch } from "@/lib/image-upload-policy";

describe("image upload policy", () => {
  it("accepts optimized images from originals up to 50MB", () => {
    expect(
      validateImageUploadBatch([
        { sourceBytes: 50 * 1024 * 1024, storedBytes: 9 * 1024 * 1024 },
      ]),
    ).toEqual({ ok: true });
  });

  it("rejects oversized originals, stored files, and batches", () => {
    expect(
      validateImageUploadBatch([
        { sourceBytes: 50 * 1024 * 1024 + 1, storedBytes: 1 },
      ]).ok,
    ).toBe(false);
    expect(
      validateImageUploadBatch([
        { sourceBytes: 20 * 1024 * 1024, storedBytes: 10 * 1024 * 1024 + 1 },
      ]).ok,
    ).toBe(false);
    expect(
      validateImageUploadBatch(
        Array.from({ length: 4 }, () => ({
          sourceBytes: 40 * 1024 * 1024,
          storedBytes: 5 * 1024 * 1024,
        })),
      ).ok,
    ).toBe(false);
  });
});
