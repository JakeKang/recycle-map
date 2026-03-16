import { rm } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as downloadGet } from "@/app/api/upload/[id]/download/route";
import { GET as readGet } from "@/app/api/upload/[id]/route";
import { POST as uploadPost } from "@/app/api/upload/route";

const { resolveRequestUserIdMock } = vi.hoisted(() => ({
  resolveRequestUserIdMock: vi.fn(),
}));

vi.mock("@/lib/request-user", () => ({
  resolveRequestUserId: resolveRequestUserIdMock,
}));

const testRootDir = path.resolve(process.cwd(), "data-test");

interface UploadResponseBody {
  id: string;
  url: string;
  readUrl: string;
  downloadUrl: string;
  name: string;
  mimeType: string;
  size: number;
}

describe("upload api routes", () => {
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00,
  ]);

  beforeEach(async () => {
    process.env.LOCAL_STORAGE_ROOT_DIR = testRootDir;
    await rm(testRootDir, { recursive: true, force: true });
    resolveRequestUserIdMock.mockReset();
  });

  afterEach(async () => {
    await rm(testRootDir, { recursive: true, force: true });
    delete process.env.LOCAL_STORAGE_ROOT_DIR;
  });

  it("returns 401 on upload when user cannot be resolved", async () => {
    resolveRequestUserIdMock.mockResolvedValue(null);

    const form = new FormData();
    form.set("file", new File([pngBytes], "a.png", { type: "image/png" }));

    const request = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: form,
    });

    const response = await uploadPost(request);
    expect(response.status).toBe(401);
  });

  it("uploads then allows owner read and download", async () => {
    resolveRequestUserIdMock.mockResolvedValue("owner-1");

    const form = new FormData();
    form.set(
      "file",
      new File([pngBytes], "avatar.png", {
        type: "image/png",
      }),
    );

    const uploadRequest = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: form,
    });
    const uploadResponse = await uploadPost(uploadRequest);

    expect(uploadResponse.status).toBe(201);

    const uploaded = (await uploadResponse.json()) as UploadResponseBody;
    expect(uploaded.id).toBeTruthy();
    expect(uploaded.readUrl).toContain(uploaded.id);
    expect(uploaded.downloadUrl).toContain(uploaded.id);

    resolveRequestUserIdMock.mockResolvedValue("owner-1");

    const readRequest = new NextRequest(`http://localhost${uploaded.readUrl}`);
    const readResponse = await readGet(readRequest, {
      params: Promise.resolve({ id: uploaded.id }),
    });

    expect(readResponse.status).toBe(200);
    expect(readResponse.headers.get("Content-Type")).toBe("image/png");
    expect(readResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(readResponse.headers.get("Content-Disposition")?.startsWith("inline;")).toBe(true);
    expect((await readResponse.arrayBuffer()).byteLength).toBe(pngBytes.length);

    resolveRequestUserIdMock.mockResolvedValue("owner-1");

    const downloadRequest = new NextRequest(
      `http://localhost${uploaded.downloadUrl}`,
    );
    const downloadResponse = await downloadGet(downloadRequest, {
      params: Promise.resolve({ id: uploaded.id }),
    });

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("Content-Type")).toBe("image/png");
    expect(downloadResponse.headers.get("Content-Disposition")?.startsWith("attachment;")).toBe(true);
    expect((await downloadResponse.arrayBuffer()).byteLength).toBe(pngBytes.length);
  });

  it("blocks read/download from non-owner", async () => {
    resolveRequestUserIdMock.mockResolvedValue("owner-2");

    const form = new FormData();
    form.set(
      "file",
      new File([pngBytes], "private.png", {
        type: "image/png",
      }),
    );

    const uploadResponse = await uploadPost(
      new NextRequest("http://localhost/api/upload", { method: "POST", body: form }),
    );
    const uploaded = (await uploadResponse.json()) as UploadResponseBody;

    resolveRequestUserIdMock.mockResolvedValue("other-user");

    const readResponse = await readGet(
      new NextRequest(`http://localhost${uploaded.readUrl}`),
      { params: Promise.resolve({ id: uploaded.id }) },
    );
    expect(readResponse.status).toBe(403);

    resolveRequestUserIdMock.mockResolvedValue("other-user");

    const downloadResponse = await downloadGet(
      new NextRequest(`http://localhost${uploaded.downloadUrl}`),
      { params: Promise.resolve({ id: uploaded.id }) },
    );
    expect(downloadResponse.status).toBe(403);
  });

  it("returns 400 for invalid file id format", async () => {
    resolveRequestUserIdMock.mockResolvedValue("owner-3");

    const response = await readGet(
      new NextRequest("http://localhost/api/upload/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );

    expect(response.status).toBe(400);
  });
});
