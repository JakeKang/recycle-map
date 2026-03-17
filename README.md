<div align="center">
  <h1>RecycleMap</h1>
  <p><strong>우리동네 자원순환 알리미</strong></p>
  <p>주변 재활용 수거함 위치를 지도에서 확인하고, 직접 제보·수정·신고·리뷰로 데이터를 함께 개선하는 지도 서비스</p>
</div>

<p align="center">
  <a href="https://github.com/JakeKang/recycle-map/actions/workflows/release-gate.yml">
    <img src="https://github.com/JakeKang/recycle-map/actions/workflows/release-gate.yml/badge.svg" alt="Release Gate" />
  </a>
  <img src="https://img.shields.io/badge/status-개발%20진행중-yellow.svg" alt="개발 진행중" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
</p>

> **🚧 현재 개발 진행중인 프로젝트입니다. 지속적인 변경이 발생할 수 있습니다.**

---

## 스크린샷

| 홈 (데스크톱) | 수거함 상세 (데스크톱) | 홈 (모바일) |
|---|---|---|
| ![홈 데스크톱](./readme-media/home-desktop.png) | ![상세 데스크톱](./readme-media/detail-desktop.png) | ![홈 모바일](./readme-media/home-mobile.png) |

---

## 핵심 기능

- **지도 탐색** — Leaflet 기반 수거함 지도 + 카테고리별 커스텀 마커
- **수거함 제보** — 지도 클릭으로 위치 지정, Daum 주소 검색, 사진 업로드
- **커뮤니티 관리** — 리뷰, 신고, 수정 제안으로 정보 정확성 유지
- **내 제보 관리** — 제보 이력 확인 및 딥링크(`/?reports=1`)로 바로 접근
- **반응형 UI** — 모바일 지도 우선 + 햄버거 패널 / 데스크톱 사이드 패널

---

## 빠른 시작

```bash
# 저장소 복제
git clone https://github.com/JakeKang/recycle-map.git
cd recycle-map

# 의존성 설치
pnpm install

# 환경 변수 설정
# .env.development, .env.production 파일을 생성하고 아래 환경 변수를 입력하세요

# 개발 서버 시작
pnpm dev
```

웹 앱: `http://localhost:3000`

---

## 환경 변수

```
.env.development  # 개발 환경 (Git 미추적)
.env.production   # 프로덕션 환경 (Git 미추적)
```

| 변수 | 설명 |
|------|------|
| `NEXTAUTH_URL` | 서비스 URL (production은 `https://` 필수) |
| `NEXTAUTH_SECRET` | NextAuth 서명 비밀키 (32자 이상) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon 공개 키 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google 소셜 로그인 |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | 카카오 소셜 로그인 |

> 민감 정보는 절대 Git에 커밋하지 않습니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 지도 | Leaflet + react-leaflet + markercluster |
| 서버 상태 | TanStack Query v5 |
| 클라이언트 상태 | Zustand |
| 인증 | NextAuth.js |
| DB | Supabase (PostgreSQL) + 로컬 폴백 스토어 |
| 테스트 | Vitest (Unit) + Playwright (E2E) |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx                    # 메인 지도 화면
│   ├── account/page.tsx            # 계정 정보
│   ├── admin/page.tsx              # 관리자 대시보드
│   └── api/
│       ├── points/                 # 수거함 CRUD + 리뷰/신고/수정제안
│       └── upload/                 # 이미지 업로드
├── components/
│   ├── map/                        # MapContainer, MapView, Marker
│   ├── panel/                      # SidebarPanelContent, PointDetailSheet, MyReportsSheet
│   ├── point/                      # RegisterPointDialog, PointForm, AddressSearch
│   └── common/                     # AuthStatus
├── hooks/                          # usePoints
├── stores/                         # Zustand (mapStore)
├── lib/                            # auth, data-repository, validators, point-visuals …
└── types/                          # point, review, report, suggestion
```

---

## 품질 게이트

```bash
pnpm lint                # ESLint 검사
pnpm test                # Vitest 단위/통합 테스트
pnpm test:e2e            # Playwright E2E 테스트
pnpm build               # 프로덕션 빌드 검증
pnpm security:audit      # 의존성 보안 감사
pnpm predeploy:check     # env/migration 사전 점검
pnpm predeploy:verify    # 통합 릴리즈 게이트 (개발)
pnpm predeploy:verify:full  # 통합 릴리즈 게이트 (전체)
pnpm perf:smoke          # 성능 스모크 테스트 (synthetic)
pnpm perf:smoke:prodlike # 성능 스모크 테스트 (프로덕션 유사)
```

CI는 모든 푸시/풀 리퀘스트에서 `predeploy:check` → `lint` → `test` → `build` → `security:audit` → `e2e`를 자동 실행합니다.

---

## 릴리즈

### MVP (2026-03)

- **범위**: 웹 서비스 전체
- **주요 기능**: 지도 탐색, 수거함 제보/상세/리뷰/신고, 내 제보 관리, 인증(Google/Kakao/Naver), 관리자 대시보드
- **품질 게이트**: lint, test, build, security:audit, e2e, predeploy:verify 통과

---

## 이슈 및 지원

- **이슈**: [GitHub Issues](https://github.com/JakeKang/recycle-map/issues)

---

## 라이선스

MIT

---

<p align="center">
  <sub>Next.js, Leaflet, Supabase, NextAuth 기반으로 구축</sub>
</p>
