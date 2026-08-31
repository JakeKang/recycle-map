<div align="center">
  <h1>RecycleMap</h1>
  <p><strong>우리동네 자원순환 알리미</strong></p>
  <p>수거함을 찾고, 시민 제보와 검증 투표로 위치 정보의 신뢰도를 함께 관리하는 지도 서비스</p>
</div>

<p align="center">
  <a href="https://github.com/JakeKang/recycle-map/actions/workflows/release-gate.yml">
    <img src="https://github.com/JakeKang/recycle-map/actions/workflows/release-gate.yml/badge.svg" alt="Release Gate" />
  </a>
  <img src="https://img.shields.io/badge/status-v1.0-166534" alt="v1.0" />
  <img src="https://img.shields.io/badge/next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" />
</p>

## 화면

| 데스크톱 지도 | 모바일 지도 | 위치 검증 | 관리자 검토 |
|:---:|:---:|:---:|:---:|
| ![데스크톱 지도](./docs/manual/images/02-home-desktop.png) | ![모바일 지도](./docs/manual/images/02-home-mobile.png) | ![위치 검증](./docs/manual/images/03-location-pending.png) | ![관리자 검토](./docs/manual/images/08-admin-reports.png) |

## v1.0 핵심 기능

| 기능 | 설명 |
| --- | --- |
| 지도 탐색 | Leaflet 지도, 검색·분류, 지도 범위 목록, URL 딥링크와 뒤로가기 복원 |
| 위치 제보 | 지도 좌표 선택, Daum 주소 검색, 현장 사진, 50m 동일 분류 중복 방지, 일일 5건 제한 |
| 시민 검증 | 로그인 사용자별 위치당 한 표, 작성자 자기 투표 차단, 선택 변경 지원 |
| 신뢰 판정 | 정확 5표 이상·찬성률 70% 이상이면 `확정`, 잘못 3표 이상이면 `정확하지 않음`, 그 외 `확인 중` |
| 정보 관리 | 리뷰, 문제 신고, 정보 수정 제안, 작성자 제보 편집과 편집 후 검증 초기화 |
| 관리자 운영 | 검증 상태 수동 조정, 신고 해결·기각, 수정 제안 적용·기각, 대기 건수 표시 |
| 반응형 UI | 데스크톱 탐색 레일·지도·검증 원장, 모바일 지도·메뉴·단계형 상세 시트 |
| 인증·계정 | NextAuth 테스트 계정과 선택적 Google·Kakao·Naver 로그인, 회원정보와 역할별 이동 |

전체 사용법과 장애 복구는 [사용자 매뉴얼](./docs/manual/README.md), 런타임 경계는 [시스템 구조](./docs/architecture.md)를 참고하세요.

## 빠른 시작

```bash
git clone https://github.com/JakeKang/recycle-map.git
cd recycle-map
pnpm install

# 아래 표를 참고해 .env.development를 준비합니다.
pnpm dev
```

로컬 앱은 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 환경 변수

### 공통·운영 필수

| 변수 | 설명 |
| --- | --- |
| `NEXTAUTH_URL` | 서비스 URL. 운영에서는 HTTPS 필수 |
| `NEXTAUTH_SECRET` | NextAuth 서명 비밀키. 운영에서는 32자 이상 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 DB 접근 키. 운영 필수, 클라이언트 노출 금지 |
| `ADMIN_USER_IDS` | 관리자 사용자 ID의 쉼표 구분 목록 |

### 선택 설정

| 변수 | 설명 |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | Kakao OAuth |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | Naver OAuth |
| `ENABLE_TEST_ACCOUNTS` / `TEST_ACCOUNT_PASSWORD` | 테스트 계정 로그인. 운영 활성화 시 패스코드 12자 이상 |
| `NEXT_PUBLIC_MAP_TILE_URL` | Leaflet 타일 URL 템플릿 |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | 타일 저작권 표시 |
| `LOCAL_STORAGE_ROOT_DIR` | 로컬 사진 저장 루트. 기본값은 프로젝트 `data` 폴더 |
| `FORCE_LOCAL_STORE` | `true`이면 Supabase 대신 메모리 저장소 사용. 개발·테스트 전용 |
| `ALLOW_DB_FALLBACK_ON_ERROR` | DB 오류 시 메모리 폴백. 운영에서는 반드시 `false` |
| `ALLOW_DEV_USER_HEADER` / `DEV_USER_HEADER_SECRET` | 비운영 개발 인증 헤더 |
| `NEXT_PUBLIC_DEV_USER_ID` | 개발 UI와 API 요청에 사용할 개발 사용자 ID |

프로덕션에서는 `ALLOW_DEV_USER_HEADER=false`, `ALLOW_DB_FALLBACK_ON_ERROR=false`, `FORCE_LOCAL_STORE=false`를 유지합니다. 민감 정보는 Git에 커밋하지 않습니다.

## 데이터베이스 적용

`supabase/migrations`의 SQL을 시간순으로 적용합니다. v1.0 시민 검증 기능에는 `20260831090000_point_verification_votes.sql`이 필요합니다. 배포 전 다음 명령으로 개발·운영 환경과 마이그레이션 구성을 검사합니다.

```bash
pnpm predeploy:check:full
```

## 개발과 품질 검사

```bash
pnpm lint             # ESLint
pnpm test             # Vitest 단위·통합 테스트
pnpm test:e2e         # Playwright 사용자 흐름
pnpm build            # 프로덕션 빌드
pnpm security:audit   # 운영 의존성 보안 감사
pnpm perf:smoke       # 반복 가능한 로컬 대량 데이터 성능 스모크
pnpm smoke:full       # 스모크 + E2E + lint + build
```

CI는 pull request와 `main` 푸시에서 릴리스 게이트를 실행합니다.

## 기술 스택

Next.js 16 App Router, React 19, TypeScript 5, Leaflet, TanStack Query, Zustand, NextAuth, Supabase PostgreSQL, Tailwind CSS, Zod, Vitest, Playwright를 사용합니다.

## 문서

- [문서 인덱스](./docs/README.md)
- [시스템 구조](./docs/architecture.md)
- [사용자 매뉴얼](./docs/manual/README.md)
- [QA 및 장애 복구](./docs/manual/09-qa-and-recovery.md)
- [화면 커버리지](./docs/manual/coverage-matrix.md)

## 향후 검토

- 공공 API 연계를 통한 초기 데이터 확장 가능성 검토
- 운영 규모에 맞춘 사진 저장소와 관측성 인프라 확장

버그 리포트와 기능 제안은 [GitHub Issues](https://github.com/JakeKang/recycle-map/issues)에 등록합니다.

## 라이선스

MIT
