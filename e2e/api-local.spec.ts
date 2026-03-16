import { expect, test } from "@playwright/test";

test.describe("local API e2e", () => {
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00,
  ]);

  test("upload/read/download ownership flow", async ({ request }) => {
    const unauthUpload = await request.post("/api/upload", {
      multipart: {
        file: {
          name: "a.png",
          mimeType: "image/png",
          buffer: pngBytes,
        },
      },
    });
    expect(unauthUpload.status()).toBe(401);

    const uploadResponse = await request.post("/api/upload", {
      headers: {
        "x-dev-user-id": "playwright-owner",
      },
      multipart: {
        file: {
          name: "avatar.png",
          mimeType: "image/png",
          buffer: pngBytes,
        },
      },
    });

    expect(uploadResponse.status()).toBe(201);
    const uploadJson = (await uploadResponse.json()) as {
      id: string;
      readUrl: string;
      downloadUrl: string;
    };
    expect(uploadJson.id).toBeTruthy();

    const readAllowed = await request.get(uploadJson.readUrl, {
      headers: {
        "x-dev-user-id": "playwright-owner",
      },
    });
    expect(readAllowed.status()).toBe(200);
    expect(readAllowed.headers()["x-content-type-options"]).toBe("nosniff");
    expect(readAllowed.headers()["content-disposition"]?.startsWith("inline;")).toBe(
      true,
    );
    expect((await readAllowed.body()).byteLength).toBe(pngBytes.length);

    const readDenied = await request.get(uploadJson.readUrl, {
      headers: {
        "x-dev-user-id": "playwright-other",
      },
    });
    expect(readDenied.status()).toBe(403);

    const downloadAllowed = await request.get(uploadJson.downloadUrl, {
      headers: {
        "x-dev-user-id": "playwright-owner",
      },
    });
    expect(downloadAllowed.status()).toBe(200);
    expect(
      downloadAllowed.headers()["content-disposition"]?.startsWith("attachment;"),
    ).toBe(true);
  });

  test("points/reviews/reports flow with local dev user headers", async ({ request }) => {
    const createPoint = await request.post("/api/points", {
      headers: {
        "x-dev-user-id": "playwright-point-owner",
        "content-type": "application/json",
      },
      data: {
        title: "플레이라이트 포인트",
        category: "other",
        lat: 35.456,
        lng: 128.456,
        address: "테스트 주소",
      },
    });

    expect(createPoint.status()).toBe(201);
    const createdPoint = (await createPoint.json()) as { id: string };
    expect(createdPoint.id).toBeTruthy();

    const createReview = await request.post(`/api/points/${createdPoint.id}/reviews`, {
      headers: {
        "x-dev-user-id": "playwright-reviewer",
        "content-type": "application/json",
      },
      data: {
        rating: 5,
        comment: "리뷰 테스트",
      },
    });
    expect(createReview.status()).toBe(201);

    const report = await request.post(`/api/points/${createdPoint.id}/reports`, {
      headers: {
        "x-dev-user-id": "playwright-reporter",
        "content-type": "application/json",
      },
      data: {
        type: "incorrect_location",
        reason: "report test",
      },
    });
    expect(report.status()).toBe(201);

    const list = await request.get("/api/points?category=other&q=%ED%94%8C%EB%A0%88%EC%9D%B4");
    expect(list.status()).toBe(200);
    const points = (await list.json()) as Array<{ id: string }>;
    expect(points.some((point) => point.id === createdPoint.id)).toBe(true);
  });
});
