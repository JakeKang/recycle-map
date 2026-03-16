import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LocalStorageError,
  MAX_UPLOAD_BYTES,
  getLocalUploadedFileMeta,
  readLocalUploadedFile,
  saveLocalUploadedFile,
} from "@/lib/local-file-storage";

const testRootDir = path.resolve(process.cwd(), "data-test");

describe("local-file-storage", () => {
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00,
  ]);

  beforeEach(async () => {
    process.env.LOCAL_STORAGE_ROOT_DIR = testRootDir;
    await rm(testRootDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(testRootDir, { recursive: true, force: true });
    delete process.env.LOCAL_STORAGE_ROOT_DIR;
  });

  it("saves and reads an uploaded image file", async () => {
    const file = new File([pngBytes], "sample.png", {
      type: "image/png",
    });

    const saved = await saveLocalUploadedFile(file, "tester-1");
    expect(saved.ownerId).toBe("tester-1");
    expect(saved.mimeType).toBe("image/png");
    expect(saved.originalName).toBe("sample.png");

    const foundMeta = await getLocalUploadedFileMeta(saved.id);
    expect(foundMeta?.id).toBe(saved.id);

    const foundFile = await readLocalUploadedFile(saved.id);
    expect(foundFile?.meta.id).toBe(saved.id);
    expect(foundFile?.data.length).toBe(pngBytes.length);
  });

  it("rejects unsupported mime type", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });

    await expect(saveLocalUploadedFile(file, "tester-2")).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<LocalStorageError>);
  });

  it("rejects mismatched file signature and declared type", async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x10]);
    const file = new File([jpegBytes], "fake.png", { type: "image/png" });

    await expect(saveLocalUploadedFile(file, "tester-2")).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<LocalStorageError>);
  });

  it("rejects files over max size", async () => {
    const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    const file = new File([oversized], "big.png", { type: "image/png" });

    await expect(saveLocalUploadedFile(file, "tester-3")).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<LocalStorageError>);
  });

  it("blocks invalid file id format", async () => {
    await expect(getLocalUploadedFileMeta("../../etc/passwd")).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<LocalStorageError>);
  });
});
