# 시스템 구조

## 목적과 범위

RecycleMap은 대한민국 내 재활용 수거함을 찾고, 시민이 위치를 제보하고, 다른 사용자의 투표로 정보 신뢰도를 판정하는 Next.js 애플리케이션입니다. 이 문서는 v1.0 코드에 존재하는 경계만 설명합니다.

## 런타임 구성

```mermaid
flowchart LR
  B[브라우저\nReact 19 + Leaflet] -->|페이지·JSON 요청| N[Next.js 16\nApp Router]
  N --> A[API Route Handlers]
  A --> G[인증·동일 출처·검증·요청 제한]
  G --> R[Data Repository]
  R -->|기본 운영 경로| S[(Supabase PostgreSQL)]
  R -->|명시적 로컬/테스트 경로| M[(메모리 저장소)]
  A -->|운영 서명·완료 검증| P[(private Supabase Storage)]
  B -->|운영 signed direct upload| P
  A -->|개발 전용| F[(로컬 업로드 디렉터리)]
  B -->|지도 타일| T[구성 가능한 타일 제공자\n기본 OpenStreetMap]
  N --> O[NextAuth\nCredentials / Google / Kakao / Naver]
```

브라우저는 TanStack Query로 서버 데이터를 가져오고 Zustand로 지도·모바일 작업면 상태를 관리합니다. 지도 목록과 상세는 `/api/points` 계열 Route Handler를 사용합니다. `data-repository.ts`가 Supabase 행과 앱 도메인 타입 사이를 변환하며, `FORCE_LOCAL_STORE=true`일 때 반복 가능한 로컬 메모리 데이터를 사용합니다.

운영 사진은 브라우저가 `/api/upload/intent`에서 받은 일회성 서명으로 private Storage에 직접 전송합니다. `/api/upload/:id/complete`가 저장 객체를 다시 내려받아 검증한 뒤에만 위치에 연결할 수 있습니다. 로컬 디렉터리 업로드 API는 production에서 `410`으로 차단됩니다.

## 주요 요청 흐름

### 위치 등록

```mermaid
sequenceDiagram
  participant U as 로그인 사용자
  participant UI as 등록 대화상자
  participant API as POST /api/points
  participant R as Repository
  U->>UI: 지도 위치 선택 후 정보 입력
  UI->>API: 제목·분류·좌표·주소·설명·사진 ID
  API->>API: 동일 출처/인증/속도/스팸/스키마 검사
  API->>R: 50m 내 같은 분류 중복 검사
  alt 중복 없음
    R-->>API: 확인 중 상태로 생성
    API-->>UI: 201 Created
  else 중복 있음
    API-->>UI: 409와 중복 안내
  end
```

등록은 사용자별 하루 5건으로 제한됩니다. 새 위치는 `확인 중`이며 정확 투표 0표, 잘못 투표 0표로 시작합니다.

### 시민 검증

```mermaid
sequenceDiagram
  participant V as 로그인 검증자
  participant API as POST /api/points/:id/votes
  participant R as Repository
  participant DB as Supabase trigger / Local store
  V->>API: 정확해요 또는 잘못됐어요
  API->>API: 작성자 본인 여부와 요청 제한 검사
  API->>R: 사용자·위치별 한 표 upsert
  R->>DB: 집계 갱신
  DB-->>R: 확인 중/확정/정확하지 않음
  R-->>V: 최신 위치와 현재 선택
```

한 사용자는 위치마다 한 표를 가지며 선택을 바꿀 수 있습니다. 작성자는 자기 위치에 투표할 수 없습니다. `잘못됐어요` 3표가 먼저 충족되면 `정확하지 않음`, 그렇지 않고 `정확해요` 5표 이상이면서 전체 찬성률 70% 이상이면 `확정`, 나머지는 `확인 중`입니다. 관리자 수동 조정값이 있으면 자동 판정보다 우선합니다. 작성자가 위치 정보를 수정하면 기존 투표와 검증 상태는 초기화되어 변경된 정보를 다시 검증합니다.

## 인증과 권한

- 운영 요청은 NextAuth 세션의 사용자 ID를 사용합니다.
- Google, Kakao, Naver는 각 클라이언트 환경 변수가 모두 있을 때만 로그인 선택지에 나타납니다.
- 테스트 계정은 개발 환경에서만 사용할 수 있으며 운영에서는 환경 변수와 관계없이 비활성화됩니다.
- `ALLOW_DEV_USER_HEADER=true`인 비운영 환경에서만 개발 사용자 헤더를 허용합니다. 비밀값이 없으면 localhost 요청으로 제한합니다.
- OAuth 사용자 ID는 `provider:providerAccountId`로 namespace를 분리합니다. 과거 raw ID는 운영자가 백업·인증 로그로 확인해 `legacy_user_identity_mappings`에 승인한 경우에만 첫 로그인에서 service-role 전용 원자 함수로 소유권을 옮기며, 미승인·충돌은 fail-closed 합니다.
- 관리자 ID는 `ADMIN_USER_IDS` 쉼표 목록으로 지정하며 운영 미설정 시 관리자가 없는 fail-closed 상태가 됩니다.
- 위치 수정은 작성자만, 검증 상태 수동 조정과 신고·수정 제안 처리는 관리자만 가능합니다.

## 데이터와 파일 저장

- Supabase 마이그레이션은 `supabase/migrations`의 시간순 SQL 파일로 관리합니다.
- 서버 데이터 접근에는 환경과 관계없이 `SUPABASE_SERVICE_ROLE_KEY`가 필요하며 anon 키 폴백은 금지됩니다. 브라우저 역할의 내부 테이블 권한은 hardening migration에서 회수하고, 로컬 메모리 모드는 `FORCE_LOCAL_STORE=true`로 명시합니다.
- 로컬 업로드는 기본적으로 `data/uploads`와 `data/upload-meta`에 저장됩니다. `LOCAL_STORAGE_ROOT_DIR`로 루트를 바꿀 수 있습니다.
- 원본 사진은 파일당 50MB·회당 150MB까지 선택할 수 있고 브라우저가 3840px·10MB 이하 WebP로 재인코딩합니다. 운영에서는 private Supabase Storage signed upload를 사용하며 완료 시 서버가 파일 시그니처·해상도·메타데이터·SHA-256을 검증합니다.
- 신고 사유, 수정 제안, 보안 감사 상세, 원본 사진 파일명은 `DATA_ENCRYPTION_KEYS`의 AES-256-GCM 키 링으로 인증 암호화합니다.
- 사진 소유·준비 상태 확인, 위치 생성, 사진 공개 연결은 단일 PostgreSQL 함수의 행 잠금과 트랜잭션으로 처리합니다.
- 운영 요청 제한과 일일 quota는 PostgreSQL의 원자 연산과 trigger로 강제합니다.
- HTML 응답은 Next.js Proxy가 요청별 nonce를 생성해 `script-src`에서 `'unsafe-inline'` 없이 실행 스크립트를 제한합니다.
- `ALLOW_DB_FALLBACK_ON_ERROR=true`는 저장소 오류를 메모리 데이터로 대체하므로 운영에서는 반드시 `false`여야 합니다.

## 운영 필수 환경 변수

| 변수 | 용도 |
| --- | --- |
| `NEXTAUTH_URL` | 공개 서비스 URL, 운영은 HTTPS |
| `NEXTAUTH_SECRET` | NextAuth 서명 비밀키, 운영은 32자 이상 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 DB 접근 키 |
| `ADMIN_USER_IDS` | 관리자 사용자 ID 목록 |
| `DATA_ENCRYPTION_KEYS` | 버전형 AES-256-GCM 키 링 |
| `UPLOAD_STORAGE_MODE` / `NEXT_PUBLIC_UPLOAD_STORAGE_MODE` | 운영 private storage 모드 |
| `TRUST_PROXY` | 전달 IP 헤더 신뢰 여부 |
| `NEXT_PUBLIC_MAP_TILE_URL` | 선택적 Leaflet 타일 URL 템플릿 |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | 선택적 타일 저작권 표시 |

소셜 로그인, 개발 인증, 로컬 저장소, 성능 스모크용 선택 변수는 프로젝트 README를 참고합니다.
