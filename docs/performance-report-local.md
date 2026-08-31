# Performance Smoke Report

Generated: 2026-08-31T08:50:47.916Z

## Scenario
- Server: http://localhost:37953
- Seed points: **3000** (env: PERF_SEED_POINTS)
- Query: /api/points?status=visible&sw_lat=37.35&sw_lng=126.65&ne_lat=37.80&ne_lng=127.20
- Notes: local store forced for repeatable synthetic load (FORCE_LOCAL_STORE=true).

## API Metrics
- Average client time: **14.7 ms**
- Average server time (header): **0.4 ms**
- Returned points: **3002**

| Run | Status | Client ms | Server ms | JSON count | Header count |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | 200 | 22.7 | 1 | 3002 | 3002 |
| 2 | 200 | 13.2 | 0 | 3002 | 3002 |
| 3 | 200 | 12.1 | 1 | 3002 | 3002 |
| 4 | 200 | 13.2 | 0 | 3002 | 3002 |
| 5 | 200 | 12.1 | 0 | 3002 | 3002 |

## UI Metrics
- Home render to stable count text: **518.2 ms**
- Sidebar list count at capture: **1422**
- Sidebar rendered list items: **180**
- Sidebar truncation summary: 데이터가 많아 목록은 180개만 표시합니다. (전체 1422개)
- Leaflet marker DOM nodes observed: **19**
- Screenshot: readme-media/perf-smoke-local.png

## Interpretation
- This smoke report validates v1.0 behavior under synthetic high-volume seed data without introducing production-only complexity.
- If client/server averages regress significantly or marker flicker becomes visible, follow Step 27 escalation path (supercluster -> canvas/WebGL review).
