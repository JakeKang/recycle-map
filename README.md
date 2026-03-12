# ♻️ RecycleMap

> **우리동네 자원순환 알리미**

참여자가 직접 폐건전지·폐소형가전·폐의약품 등의 수거함 위치를 지도에 등록·공유하는 서비스입니다.
자취하면서 폐건전지, 폐소형가구, 폐의약품 등 배출 장소를 찾는 데 어려움을 겪어 제작하게 되었습니다.

서비스 기획을 위한 리서치를 진행하던 중, 2025년 말 기후에너지환경부 주관으로 생활폐기물 분리배출 안내 사이트가 공개되었습니다. 👏

주소: [생활폐기물 분리배출 누리집](https://분리배출.kr/)

해당 사이트는 국가기관 주관으로 운영되며, 일부 지역의 분리배출 및 수거함 정보가 사전에 등록되어 제공됩니다.

본 프로젝트는 위 서비스와 일부 목적이 겹칠 수 있으나, 다음과 같은 차별화된 방향을 고려하여 개발을 진행하고 있습니다.

### 트레이드오프 및 설계 방향
- 데이터 수집 방식
   - 국가기관 서비스는 행정 데이터를 기반으로 수거함 정보를 사전 등록하는 방식
   - 본 서비스는 사용자 참여 기반으로 빠른 반영 및 수정 예정
- 성능 및 사용자 경험 개선
   - 지도 로딩 및 데이터 표시 속도를 개선하여 더 빠르고 안정적으로 사용할 수 있도록 설계
   - 리뷰/사진 등을 통해 변경된 위치, 정보의 정확성을 확보할 수 있도록 설계
- API 호출 최적화
   - Throttle / Debounce 적용
   - 불필요한 잦은 렌더링 및 API 호출을 방지하여 성능 개선
- 지도 렌더링 최적화
   - 지도 LOD(Level of Detail) 에 따라 마커를 그룹화하여 표시
   - 확대/축소 상황에서도 가독성을 유지하도록 설계

---

## ⚠️ Development Status

이 프로젝트는 현재 **초기 개발 단계**입니다.

```
🟢 기획서 작성 완료 (v1.1)
🟢 UI/UX 목업 완료
🟡 MVP 개발 진행 중
⚪ 테스트 / QA
⚪ 배포
```

---

## 핵심 가치

```
🔍 사용자   →  지도에서 근처 수거함 확인 + 네비게이션(네이버/카카오 지도 서비스 연계) 길안내
📝 기여자   →  수거함 위치 제보로 커뮤니티 기여
🛡️ 커뮤니티 →  별점/댓글/신고로 정보 신뢰성 자체 관리
```

## 수거함 카테고리 (추가 예정)

| 아이콘 | 카테고리 |
|--------|----------|
| 🔋 | 폐건전지 |
| 📱 | 폐소형가전 |
| 💊 | 폐의약품 |
| 💡 | 폐형광등 |
| 🖨️ | 폐토너 |
| ♻️ | 기타 |

## 주요 기능

- **지도 뷰** — Leaflet + OpenStreetMap 기반 수거함 위치 표시, 마커 클러스터링
- **수거함 등록** — 지도 클릭으로 위치 지정, Daum 우편번호 서비스 주소 검색, 사진 업로드
- **상세 정보** — 카테고리, 별점, 리뷰, 사진, 등록자 정보
- **길안내 연계** — 카카오맵 / 네이버지도 딥링크
- **커뮤니티 관리** — 별점/댓글, 신고/수정요청, 스팸 필터링
- **반응형** — 데스크톱 사이드 패널 + 모바일 바텀 시트

## 설계 원칙

```
⚠️ 상용 API 의존도 0 | API 키 관리 0 | 초기 비용 0
```

- 지도: Leaflet + OpenStreetMap (무료, API 키 불필요)
- 주소 검색: Daum 우편번호 서비스 (무료, 무제한, API 키 불필요)
- 역지오코딩 불필요 — 좌표는 지도 클릭으로 직접 입력

## 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| Framework | Next.js 14+ (App Router) | SSR/SSG, RSC(Server Component) |
| Language | TypeScript 5+ | 타입 안정성 |
| Styling | TailwindCSS + Shadcn/UI | 빠른 UI 개발, 접근성 |
| Map | react-leaflet + Leaflet | 무료, 경량, API 키 불필요 |
| Address | Daum 우편번호 서비스 v2 | 무료, 무제한 |
| Server State | TanStack Query v5 | 캐싱, Optimistic Update |
| Client State | Zustand | 지도 필터, UI 상태 |
| DB | Supabase (PostgreSQL + PostGIS) | 공간 쿼리, 무료 티어, 필요 시 PostgreSQL 직접 운영 |
| Auth | NextAuth.js v5 | 카카오/네이버/구글 소셜 로그인 |
| Deploy | Cloud or On-Premise | 편한 방식으로 배포 |
| Test | Vitest + Testing Library, Playwright | 단위/통합/E2E |

## 프로젝트 구조 (변경 예정)

```
src/
├── app/
│   ├── page.tsx                  # 메인 (지도 뷰)
│   ├── point/[id]/page.tsx       # 수거함 상세
│   ├── admin/page.tsx            # 관리자 대시보드
│   └── api/
│       ├── points/               # 수거함 CRUD
│       ├── points/[id]/reviews/  # 리뷰
│       ├── points/[id]/reports/  # 신고
│       └── upload/               # 이미지 업로드
├── components/
│   ├── map/                      # MapContainer, Markers, Controls
│   ├── panel/                    # SidePanel, BottomSheet, SearchBar
│   ├── point/                    # Detail, Form, AddressSearch, Review
│   └── ui/                       # Shadcn/UI
├── hooks/                        # usePoints, useGeolocation, useDaumPostcode
├── stores/                       # Zustand (mapStore)
├── lib/
│   ├── supabase/                 # client, server, admin
│   ├── navigation.ts             # 카카오맵/네이버 딥링크
│   ├── spam-filter.ts
│   └── validators.ts             # Zod 스키마
├── types/                        # point, review, report, map
└── constants/                    # categories, map defaults
```

## 시작하기

> 🚧 아직 개발 초기 단계이므로 setup 과정이 변경될 수 있습니다.

```bash
# 저장소 클론
git clone https://github.com/JakeKang/recycle-map.git
cd recycle-map

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.development .env.production

# 개발 서버 실행
pnpm dev
```

### 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# 소셜 로그인
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 앱 식별자
NEXT_PUBLIC_APP_NAME=recyclemap
```

> 지도(Leaflet+OSM)와 주소 검색(Daum 우편번호)은 API 키가 불필요합니다.

## 로드맵

- [x] 서비스 기획서 v1.1
- [x] UI/UX 목업
- [ ] **Phase 1 — MVP (4주)**: 지도 렌더링, 마커 클러스터링, 수거함 등록/상세, 주소 검색, 반응형 레이아웃
- [ ] **Phase 2 — 고도화 (4주)**: 별점/댓글, 신고/수정요청, 관리자 대시보드, SEO, E2E 테스트
- [ ] **Phase 3 — 확장**: 공공데이터 연동, PWA, 브이월드 타일, 게이미피케이션, 다국어 지원

## 라이선스

MIT License
