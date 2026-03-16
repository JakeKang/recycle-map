import { expect, test } from "@playwright/test";

test.describe("local UI e2e", () => {
  test("map state syncs with url search params", async ({ page }) => {
    await page.goto("/?q=시청&category=battery&point=seed-1&sheet=full");

    await expect(page.getByRole("heading", { name: "우리동네 자원순환 알리미" })).toBeVisible();
    await expect(page.getByPlaceholder("주소 또는 장소명으로 검색")).toHaveValue("시청");

    await expect.poll(() => new URL(page.url()).searchParams.get("category")).toBe("battery");
    await expect.poll(() => new URL(page.url()).searchParams.get("point")).toBe("seed-1");
    await expect.poll(() => new URL(page.url()).searchParams.get("sheet")).toBe("full");

    await page.getByPlaceholder("주소 또는 장소명으로 검색").fill("마포");
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("마포");

    await page.getByRole("button", { name: "전체" }).first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get("category")).toBe(null);

    const detailSheet = page.locator('aside[aria-label="포인트 상세 시트"]');
    await detailSheet.getByRole("button", { name: "닫기" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("point")).toBe(null);
    await expect.poll(() => new URL(page.url()).searchParams.get("sheet")).toBe(null);

    await page.goto("/?point=seed-1&sheet=full");
    await page.locator("body").click({ position: { x: 20, y: 20 } });
    await page.keyboard.press("[");
    await expect.poll(() => new URL(page.url()).searchParams.get("sheet")).toBe(null);
    await page.keyboard.press("[");
    await expect.poll(() => new URL(page.url()).searchParams.get("sheet")).toBe("peek");
    await page.keyboard.press("Escape");
    await expect.poll(() => new URL(page.url()).searchParams.get("point")).toBe(null);
    await expect.poll(() => new URL(page.url()).searchParams.get("sheet")).toBe(null);

    await page.goto("/?reports=1");
    await expect(page.getByRole("heading", { name: "내 제보 관리" })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("reports")).toBe("1");
    await page.getByRole("button", { name: "닫기" }).first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get("reports")).toBe(null);

    await page.goto("/?point=seed-1&sheet=full&reports=1");
    await expect(page.getByRole("heading", { name: "내 제보 관리" })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("reports")).toBe("1");
    await expect.poll(() => new URL(page.url()).searchParams.get("point")).toBe(null);
    await expect.poll(() => new URL(page.url()).searchParams.get("sheet")).toBe(null);

    await page.goto("/?point=seed-1");
    await expect.poll(() => new URL(page.url()).searchParams.get("point")).toBe("seed-1");
    await page.getByRole("button", { name: "내 제보" }).first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get("reports")).toBe("1");
    await expect.poll(() => new URL(page.url()).searchParams.get("point")).toBe(null);
    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get("reports")).toBe(null);
    await expect.poll(() => new URL(page.url()).searchParams.get("point")).toBe("seed-1");

    await page.goto("/");
    await page.getByRole("button", { name: "시청역 폐건전지 수거함" }).first().click();
    await expect.poll(() => new URL(page.url()).searchParams.get("point")).toBe("seed-1");
  });

  test("map click registration to detail review/report flow", async ({ page }) => {
    const title = `UI 자동 포인트 ${Date.now()}`;

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "우리동네 자원순환 알리미" })).toBeVisible();

    const map = page.locator(".leaflet-container:visible").first();
    await expect(map).toBeVisible();
    await map.click({ position: { x: 240, y: 180 } });

    await page.getByRole("button", { name: "이 위치 등록" }).click();

    await page
      .getByPlaceholder("제목 (예: OO아파트 폐건전지함)")
      .fill(title);
    await page.getByPlaceholder("주소 (선택)").fill("UI 테스트 주소");

    const createPointResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/points") &&
        response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "제보 등록하기" }).click();

    const createPointResponse = await createPointResponsePromise;
    expect(createPointResponse.status()).toBe(201);
    const createdPoint = (await createPointResponse.json()) as { id: string };
    expect(createdPoint.id).toBeTruthy();

    await page.goto(`/point/${createdPoint.id}`);

    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    const createReviewResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/reviews") &&
        response.request().method() === "POST",
    );

    await page.getByPlaceholder("리뷰 코멘트 (선택)").fill("UI 리뷰 내용");
    await page.getByRole("button", { name: "리뷰 등록" }).click();

    const createReviewResponse = await createReviewResponsePromise;
    expect(createReviewResponse.status()).toBe(201);
    await expect(page.getByText("UI 리뷰 내용")).toBeVisible();

    const createReportResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/reports") &&
        response.request().method() === "POST",
    );

    await page.getByPlaceholder("신고 사유 (선택)").fill("UI 신고 내용");
    await page.getByRole("button", { name: "잘못된 위치 신고" }).click();

    const createReportResponse = await createReportResponsePromise;
    expect(createReportResponse.status()).toBe(201);
  });
});
