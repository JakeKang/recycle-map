import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const rootDir = process.cwd();
const port = Number(process.env.PERF_PORT ?? 3401);
const seedCount = Number(process.env.PERF_SEED_POINTS ?? 3000);
const forceLocalStore = process.env.PERF_FORCE_LOCAL_STORE !== "false";
const allowDbFallback = process.env.PERF_ALLOW_DB_FALLBACK !== "false";
const status = "visible";

const baseUrl = `http://127.0.0.1:${port}`;
const queryString = new URLSearchParams({
  status,
  sw_lat: "37.35",
  sw_lng: "126.65",
  ne_lat: "37.80",
  ne_lng: "127.20",
}).toString();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // noop
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for server: ${url}`);
}

async function measureApiRuns(url, runs = 5) {
  const samples = [];
  let pointsCount = 0;

  for (let index = 0; index < runs; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(url);
    const payload = await response.json();
    const elapsedMs = performance.now() - startedAt;

    pointsCount = Array.isArray(payload) ? payload.length : 0;
    samples.push({
      run: index + 1,
      status: response.status,
      elapsedMs: Number(elapsedMs.toFixed(1)),
      serverMs: Number(response.headers.get("x-points-query-ms") ?? "0"),
      countHeader: Number(response.headers.get("x-points-count") ?? "0"),
      pointsCount,
    });
  }

  const avgClientMs = Number(
    (samples.reduce((sum, row) => sum + row.elapsedMs, 0) / samples.length).toFixed(1),
  );
  const avgServerMs = Number(
    (samples.reduce((sum, row) => sum + row.serverMs, 0) / samples.length).toFixed(1),
  );

  return {
    samples,
    avgClientMs,
    avgServerMs,
    pointsCount,
  };
}

async function measureUi(base, options) {
  const expectPositiveCount = options.expectPositiveCount;
  const screenshotName = options.screenshotName;

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const startedAt = performance.now();

    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "우리동네 자원순환 알리미" }).waitFor({ timeout: 45_000 });
    const countLocator = page.getByText(/전체 · \d+개/).first();
    await countLocator.waitFor({ timeout: 45_000 });
    if (expectPositiveCount) {
      try {
        await page.waitForFunction(() => {
          const paragraphs = Array.from(document.querySelectorAll("p"));
          for (const paragraph of paragraphs) {
            const text = paragraph.textContent ?? "";
            const matched = text.match(/전체 · (\d+)개/);
            if (matched && Number(matched[1]) > 0) {
              return true;
            }
          }
          return false;
        }, { timeout: 12_000 });
      } catch {
        // Keep latest visible count even if it remains zero.
      }
    }

    const countText = (await countLocator.textContent()) ?? "";
    const uiListCount = Number((countText.match(/(\d+)개/)?.[1] ?? "0"));

    const loadMs = Number((performance.now() - startedAt).toFixed(1));
    try {
      await page.locator(".leaflet-marker-icon, .marker-cluster").first().waitFor({ timeout: 5_000 });
    } catch {
      // Marker DOM may be absent if all points are outside current viewport.
    }
    const markerCount = await page.evaluate(
      () =>
        document.querySelectorAll(".leaflet-marker-icon, .leaflet-marker-shadow, .marker-cluster").length,
    );

    const screenshotPath = path.join(rootDir, "readme-media", screenshotName);
    await page.screenshot({ path: screenshotPath, fullPage: true, type: "png" });

    return {
      loadMs,
      uiListCount,
      markerCount,
      screenshotName,
      screenshotPath,
    };
  } finally {
    await browser.close();
  }
}

function makeReport({ apiMetrics, uiMetrics, seed, targetUrl, notes }) {
  const generatedAt = new Date().toISOString();
  const rows = apiMetrics.samples
    .map(
      (row) =>
        `| ${row.run} | ${row.status} | ${row.elapsedMs} | ${row.serverMs} | ${row.pointsCount} | ${row.countHeader} |`,
    )
    .join("\n");

  return `# Performance Smoke Report\n\nGenerated: ${generatedAt}\n\n## Scenario\n- Server: ${targetUrl}\n- Seed points: **${seed}** (env: PERF_SEED_POINTS)\n- Query: /api/points?${queryString}\n- Notes: ${notes}\n\n## API Metrics\n- Average client time: **${apiMetrics.avgClientMs} ms**\n- Average server time (header): **${apiMetrics.avgServerMs} ms**\n- Returned points: **${apiMetrics.pointsCount}**\n\n| Run | Status | Client ms | Server ms | JSON count | Header count |\n| --- | --- | ---: | ---: | ---: | ---: |\n${rows}\n\n## UI Metrics\n- Home render to stable count text: **${uiMetrics.loadMs} ms**\n- Sidebar list count at capture: **${uiMetrics.uiListCount}**\n- Leaflet marker DOM nodes observed: **${uiMetrics.markerCount}**\n- Screenshot: readme-media/${uiMetrics.screenshotName}\n\n## Interpretation\n- This smoke report validates MVP behavior under synthetic high-volume seed data without introducing production-only complexity.\n- If client/server averages regress significantly or marker flicker becomes visible, follow Step 27 escalation path (supercluster -> canvas/WebGL review).\n`;
}

async function main() {
  const notes = forceLocalStore
    ? "local store forced for repeatable synthetic load (FORCE_LOCAL_STORE=true)."
    : "production-like mode (FORCE_LOCAL_STORE=false). Requires valid external DB configuration.";
  const screenshotName = forceLocalStore
    ? "perf-smoke-local.png"
    : "perf-smoke-prodlike.png";

  const devServer = spawn("pnpm", ["dev", "--port", String(port)], {
    cwd: rootDir,
    env: {
      ...process.env,
      FORCE_LOCAL_STORE: forceLocalStore ? "true" : "false",
      ALLOW_DB_FALLBACK_ON_ERROR: allowDbFallback ? "true" : "false",
      PERF_SEED_POINTS: String(seedCount),
      PERF_SEED_REPORTED_RATIO: process.env.PERF_SEED_REPORTED_RATIO ?? "0.15",
    },
    stdio: "ignore",
  });

  let exited = false;
  devServer.on("exit", () => {
    exited = true;
  });

  try {
    await waitForServer(`${baseUrl}/api/points?${queryString}`);

    const apiMetrics = await measureApiRuns(`${baseUrl}/api/points?${queryString}`);
    const uiMetrics = await measureUi(baseUrl, {
      expectPositiveCount: forceLocalStore,
      screenshotName,
    });

    const report = makeReport({
      apiMetrics,
      uiMetrics,
      seed: seedCount,
      targetUrl: baseUrl,
      notes,
    });

    const reportFile =
      process.env.PERF_REPORT_FILE ??
      (forceLocalStore ? "performance-report-local.md" : "performance-report-prodlike.md");

    await fs.writeFile(path.join(rootDir, "docs", reportFile), report, "utf-8");
    console.log(`[perf-smoke] report written: docs/${reportFile}`);
  } finally {
    if (!exited) {
      devServer.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error("[perf-smoke] failed:", error);
  process.exit(1);
});
