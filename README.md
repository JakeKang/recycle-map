<div align="center">
  <h1>♻ RecycleMap</h1>
  <p><strong>우리동네 자원순환 알리미</strong></p>
  <p>주변 재활용 수거함 위치를 지도에서 확인하고,<br>직접 제보·수정·신고·리뷰로 데이터를 함께 개선하는 지도 서비스</p>
</div>

<p align="center">
  <a href="https://github.com/JakeKang/recycle-map/actions/workflows/release-gate.yml">
    <img src="https://github.com/JakeKang/recycle-map/actions/workflows/release-gate.yml/badge.svg" alt="Release Gate" />
  </a>
  <img src="https://img.shields.io/badge/status-개발%20진행중-yellow" alt="개발 진행중" />
  <img src="https://img.shields.io/badge/next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
</p>

> **🚧 현재 개발 진행중인 프로젝트입니다.**  
> MVP 기능 구현 및 안정화가 진행 중이며, 지속적인 변경이 발생할 수 있습니다.

---

## 스크린샷

| 홈 (데스크톱) | 수거함 상세 | 모바일 지도 | 모바일 메뉴 |
|:---:|:---:|:---:|:---:|
| ![홈 데스크톱](./readme-media/home-desktop.png) | ![상세 데스크톱](./readme-media/detail-desktop.png) | ![모바일](./readme-media/dummy-mobile-map.png) | ![메뉴](./readme-media/dummy-mobile-menu.png) |

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **지도 탐색** | Leaflet 기반 수거함 지도, 카테고리별 커스텀 마커, 현재 위치 자동 진입 |
| **수거함 제보** | 지도 클릭으로 위치 지정, Daum 주소 검색, 사진 업로드 |
| **커뮤니티 관리** | 리뷰 작성, 위치 신고, 수정 제안으로 정보 정확성 유지 |
| **내 제보 관리** | 제보 이력 확인 및 딥링크(`/?reports=1`) 직접 진입 |
| **URL 딥링크** | `q` · `category` · `point` · `sheet` · `reports` 상태 동기화 및 뒤로가기 복원 |
| **반응형 UI** | 모바일 지도 우선(햄버거 드로어) / 데스크톱 사이드 패널 |
| **관리자 대시보드** | 신고 처리, 수정 제안 승인, 포인트 상태 관리 |
| **계정 관리** | `/account` 페이지, 소셜 로그인(Google · Kakao · Naver) |

---

## 빠른 시작

```bash
# 저장소 복제
git clone https://github.com/JakeKang/recycle-map.git
cd recycle-map

# 의존성 설치
pnpm install

# 환경 변수 설정 (아래 환경 변수 섹션 참고)
# .env.development 파일을 생성하세요

# 개발 서버 시작
pnpm dev
```

앱: `http://localhost:3000`

---

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|:---:|
| `NEXTAUTH_URL` | 서비스 URL (production은 `https://` 필수) | ✅ |
| `NEXTAUTH_SECRET` | NextAuth 서명 비밀키 (32자 이상) | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon 공개 키 | ✅ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | 선택 |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | 카카오 OAuth | 선택 |
| `ALLOW_DEV_USER_HEADER` | 개발용 헤더 인증 허용 (dev only: `true`) | 개발 |
| `FORCE_LOCAL_STORE` | DB 없이 메모리 스토어 사용 | 개발 |

> ⚠️ 프로덕션에서는 `ALLOW_DEV_USER_HEADER=false`, `FORCE_LOCAL_STORE=false`를 반드시 확인하세요.  
> 민감 정보는 절대 Git에 커밋하지 않습니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | [Next.js 16](https://nextjs.org) (App Router) |
| 언어 | TypeScript 5 |
| 지도 | [Leaflet](https://leafletjs.com) + react-leaflet + markercluster |
| 서버 상태 | [TanStack Query v5](https://tanstack.com/query) |
| 클라이언트 상태 | [Zustand](https://zustand-demo.pmnd.rs) |
| 인증 | [NextAuth.js](https://next-auth.js.org) |
| DB | [Supabase](https://supabase.com) (PostgreSQL) + 메모리 폴백 스토어 |
| 스타일 | [Tailwind CSS](https://tailwindcss.com) |
| 입력 검증 | [Zod](https://zod.dev) |
| 단위 테스트 | [Vitest](https://vitest.dev) v4 (13 files / 33 tests) |
| E2E 테스트 | [Playwright](https://playwright.dev) v1.58 (5 tests) |

---

## 개발 관련

```bash
pnpm lint       # 린트 검사
pnpm test       # 단위·통합 테스트
pnpm test:e2e   # E2E 테스트
pnpm build      # 프로덕션 빌드
```

CI는 모든 PR / `main` 푸시에서 게이트 파이프라인을 자동 실행합니다.

---

## 이슈

- **버그 리포트 / 기능 제안**: [GitHub Issues](https://github.com/JakeKang/recycle-map/issues)

---

## 라이선스

MIT

---

<div align="center">
  <sub>Next.js · Leaflet · Supabase · NextAuth · Tailwind CSS 기반으로 구축되었습니다.</sub>
</div>

---

## 공공 API
2026.03.20
[기후에너지환경부_분리배출 정보조회 서비스](https://www.data.go.kr/data/15156866/openapi.do)
- 초기 데이터 연계 가능성 확인
