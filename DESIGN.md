---
name: RecycleMap
description: 시민이 제보한 수거함을 지도에서 찾고 검증 근거를 함께 읽는 자원순환 위치 원장
colors:
  paper: "#f7f6f1"
  paper-raised: "#fcfbf7"
  paper-muted: "#ecece5"
  paper-hover: "#f1f0e9"
  ink: "#19231f"
  ink-muted: "#59645e"
  line: "#d3d6ce"
  line-strong: "#aeb6ae"
  trust: "#176b4d"
  trust-strong: "#12563d"
  trust-soft: "#e0eee8"
  pending: "#9a661b"
  pending-soft: "#f3ead5"
  pending-ink: "#754b12"
  danger: "#a64436"
  danger-soft: "#f3e2de"
  white: "#ffffff"
  selection-bg: "#bddacb"
  selection-ink: "#0f3f2d"
  category-battery: "#f59e0b"
  category-electronics: "#3b82f6"
  category-medicine: "#ef4444"
  category-fluorescent: "#8b5cf6"
  category-toner: "#64748b"
  category-other: "#10b981"
typography:
  body:
    fontFamily: "Noto Sans KR, sans-serif"
  ledger:
    fontFamily: "Noto Serif KR, serif"
rounded:
  control: "0.625rem"
  dialog: "0.75rem"
  sheet: "1rem"
  pill: "9999px"
components:
  verification-vote:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "42px"
  verification-vote-accurate-selected:
    backgroundColor: "{colors.trust}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
  verification-vote-inaccurate-selected:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
  verification-state-pending:
    backgroundColor: "{colors.pending-soft}"
    textColor: "{colors.pending-ink}"
    rounded: "{rounded.pill}"
  verification-state-verified:
    backgroundColor: "{colors.trust-soft}"
    textColor: "{colors.trust-strong}"
    rounded: "{rounded.pill}"
  verification-state-inaccurate:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
---

# Design System: RecycleMap

## Overview

**Creative North Star: “시민 검증 집계표”**

RecycleMap은 지도 앱의 익숙한 둥근 플로팅 카드 문법 대신, 시민 투표 집계표와 공공 데이터 원장을 한 작업면에 결합한다. 종이빛 배경 위 먹색 텍스트와 얇은 구분선을 기본으로 삼고, 색은 위치의 신뢰 상태와 지도 카테고리를 식별할 때만 사용한다. 화면의 개성은 장식이 아니라 탐색 레일·지도·검증 원장이 이어지는 구조와 정확한 수치 정렬에서 나온다.

운영 모드는 **Operate**다. 사용자는 주변 위치를 찾고, 제보의 신뢰도를 이해하고, 현장 확인에 근거한 한 표를 남긴다. 미검증 또는 부정확한 위치도 숨기지 않되 `확인 중`, `확정`, `정확하지 않음`을 텍스트·아이콘·색으로 동시에 구분한다.

**핵심 특징:**

- 지도 중심의 연속 작업면과 데스크톱 3열 정보 구조
- 종이·먹·헤어라인을 바탕으로 한 낮은 시각 소음
- 녹색·호박색·적색의 제한된 신뢰 상태 체계
- 장식 카드 대신 목록 행, 구분선, 집계 열로 만드는 계층
- 한국어 직접 레이블, 표형 숫자, 현장 검증 기준의 명시

## Colors

팔레트는 따뜻한 무광 종이와 짙은 먹색을 바탕으로 하며, 신뢰 상태 색은 의미가 있는 좁은 영역에만 배치한다. 토큰의 원본은 [`src/app/globals.css`](src/app/globals.css)의 `:root`다.

### Primary

- **신뢰 녹색 — `--trust`** (`#176b4d`): 주요 행동, 선택 상태, 확정 상태의 기본색이다.
- **짙은 신뢰 녹색 — `--trust-strong`** (`#12563d`): 주요 행동의 hover, 강조 테두리, 확정 상태의 텍스트에 쓴다.
- **옅은 신뢰 녹색 — `--trust-soft`** (`#e0eee8`): 선택한 목록 행과 확정 배지의 낮은 명도 배경이다.

### Trust states

- **확인 호박색 — `--pending`** (`#9a661b`), **`--pending-soft`** (`#f3ead5`), **`--pending-ink`** (`#754b12`): 아직 투표 기준을 통과하지 않은 제보와 대기 상태에만 쓴다.
- **오류 적색 — `--danger`** (`#a64436`), **`--danger-soft`** (`#f3e2de`): `정확하지 않음`, 신고, 오류, 복구가 필요한 상태에 쓴다.

### Neutrals

- **기본 종이 — `--paper`** (`#f7f6f1`): 앱 전체 배경이다.
- **올린 종이 — `--paper-raised`** (`#fcfbf7`): 탐색 레일, 검증 원장, 시트, 다이얼로그의 작업면이다.
- **무채 종이 — `--paper-muted`** (`#ecece5`), **행 hover — `--paper-hover`** (`#f1f0e9`): 비활성 또는 상호작용 피드백에 쓴다.
- **먹색 — `--ink`** (`#19231f`): 제목과 핵심 수치다.
- **옅은 먹색 — `--ink-muted`** (`#59645e`): 보조 설명과 메타데이터다.
- **집계선 — `--line`** (`#d3d6ce`), **강한 집계선 — `--line-strong`** (`#aeb6ae`): 행, 열, 섹션을 나눈다.
- **선택 — `--selection-bg`** (`#bddacb`), **`--selection-ink`** (`#0f3f2d`): 텍스트 선택 색이다.

### Map categories

지도 카테고리 본체에는 `--category-battery`, `--category-electronics`, `--category-medicine`, `--category-fluorescent`, `--category-toner`, `--category-other`를 쓴다. 각 카테고리는 `-ring`, `-ink`, `-soft` 짝을 가지며, 구현 원본은 `CATEGORY_VISUALS`다. 카테고리색은 **무엇을 수거하는지**를, 신뢰 색은 **정보가 얼마나 검증됐는지**를 나타내므로 서로의 역할을 바꾸지 않는다.

**상태 색 경계 규칙.** 넓은 장식 색면을 만들지 않는다. 신뢰 색은 배지, 마커 테두리, 선택선, 행동 버튼처럼 상태의 경계에서만 쓴다. 상태는 색상 단독으로 전달하지 않고 항상 한국어 레이블과 아이콘 또는 수치를 함께 둔다.

## Typography

**Body Font:** Noto Sans KR (`--font-sans`, 원본 `--font-noto-sans-kr`), sans-serif fallback
**Ledger Font:** Noto Serif KR (`--font-ledger`, 원본 `--font-noto-serif-kr`), serif fallback

Noto Sans KR은 검색, 양식, 목록, 안내처럼 빠르게 읽고 조작하는 정보를 담당한다. Noto Serif KR은 `.font-ledger`를 통해 제품명, 패널 제목, 위치 제목, 검증 원장 제목에만 사용해 공공 기록지의 성격을 만든다.

### Hierarchy

- **제품명:** `text-2xl`(1.5rem), 700, `tracking-[-0.03em]`, ledger font.
- **위치/페이지 제목:** `text-xl`(1.25rem), 700, 필요 시 `tracking-[-0.02em]`, ledger font.
- **패널/다이얼로그 제목:** `text-lg`(1.125rem), 700, ledger font.
- **검증 섹션 제목:** 1.08rem, 700, `letter-spacing: -0.02em`, ledger font.
- **본문과 조작:** `text-sm`(0.875rem)을 기본으로 한다.
- **보조 설명:** `text-xs`(0.75rem), 검증 설명은 0.78rem과 `line-height: 1.55`를 사용한다.
- **밀도 높은 원장 레이블:** 11px·10px를 사용하며, 투표 수와 목록 집계는 `font-variant-numeric: tabular-nums` 또는 `tabular-nums`로 열을 맞춘다.
- **읽기 폭:** 장문 화면은 `--measure-reading: 70ch`를 넘기지 않는다.

**원장 서체 절제 규칙.** Serif는 제목과 장부의 시작점에만 사용한다. 본문 전체나 버튼 레이블을 Serif로 바꾸지 않는다. 큰 마케팅용 디스플레이 문구를 지도 위에 얹지 않는다.

## Layout

### Desktop

`md`(48rem) 이상에서 홈은 하나의 연속 작업면이다.

- 왼쪽 탐색 레일: `--layout-search-rail: 21.25rem`
- 중앙 지도: `minmax(0, 1fr)`로 남은 폭을 채운다.
- 위치 선택 시 오른쪽 상세/검증 원장: `--layout-detail-rail: 24.375rem`
- 상세 원장이 열리면 중앙 작업면에 같은 폭의 오른쪽 여백을 확보해 지도를 가리지 않는다.
- 목록과 원장 내부는 별도 카드 묶음 대신 `border-bottom`, `border-block`, 3열 집계선으로 구획한다.

### Mobile

48rem 미만에서는 지도를 전체 작업면으로 유지하고 탐색과 상세를 오버레이한다.

- 탐색은 왼쪽 드로어이며 폭 `88%`, 최대 `--layout-mobile-menu: 22.5rem`이다.
- 선택 위치 상세는 하단 시트로 열리며 `--sheet-peek-height: 44vh`, `--sheet-mid-height: 72vh`, `--sheet-full-height: 92vh`의 세 단계를 사용한다.
- 상세 시트는 상단 드래그 핸들과 `요약 / 중간 / 전체` 직접 제어를 제공한다.
- 하단 탭은 모바일에서만 고정하고, 활성 탭은 녹색 텍스트와 2px 하단선으로 표시한다.
- 420px 이하에서는 검증 집계의 긴 기준 설명을 숨기되 상태명과 숫자는 유지한다.

### Spacing rhythm

현재 코드는 별도 `--spacing-*` 사용자 정의 토큰을 두지 않고 Tailwind 간격 유틸리티를 사용한다. 반복되는 실제 리듬은 4px(`gap-1`), 6px(`gap-1.5`), 8px(`gap-2`), 12px(`space-y-3`), 16px(`px-4`, `p-4`), 20px(`p-5`)이다. 검증 원장은 18px의 블록 패딩, 16px의 제목 간격, 14px의 행동 위 여백을 사용한다. 새 UI는 이 리듬을 우선 재사용하고 임의의 간격 값을 추가하지 않는다.

## Elevation & Depth

기본 화면은 평평하다. 종이 면의 명도 차이와 1px 집계선이 깊이의 주된 수단이며, 그림자는 작업면이 실제로 겹칠 때만 사용한다. `.elevation-*` 유틸리티가 화면 역할과 그림자 토큰을 연결한다.

### Shadow vocabulary

- **플로팅 지도 도구 — `--shadow-float`:** `0 6px 18px rgba(25, 35, 31, 0.2)`; 지도 위 모바일 메뉴·현재 위치 도구에만 사용한다.
- **다이얼로그 — `--shadow-dialog`:** `0 24px 50px rgba(25, 35, 31, 0.24)`; 모달 작업면에 사용한다.
- **모바일 시트 — `--shadow-sheet-mobile`:** `0 -16px 36px rgba(25, 35, 31, 0.18)`.
- **데스크톱 상세 원장 — `--shadow-sheet-desktop`:** `-10px 0 28px rgba(25, 35, 31, 0.08)`.
- **모바일 탐색 레일 — `--shadow-rail`:** `8px 0 32px rgba(25, 35, 31, 0.18)`.
- **지도 마커 — `--shadow-marker`:** `0 7px 14px rgba(25, 35, 31, 0.2)`; 선택 상태는 `--shadow-marker-selected`, 상태 배지는 `--shadow-marker-badge`, 신고 주의는 `--shadow-marker-alert`, 신규 위치는 `--shadow-marker-registration`을 사용한다.

**겹침에만 깊이 규칙.** 정적인 목록 행이나 정보 섹션에 그림자를 붙이지 않는다. 깊이는 다이얼로그, 드로어, 하단 시트, 지도 위 컨트롤과 마커처럼 실제 z축 관계가 있을 때만 허용한다.

## Shapes

형태는 직선과 헤어라인이 기본이다. 목록 행, 검색 필드, 주요 버튼, 집계 열은 불필요한 둥근 모서리 없이 맞물리고, 반경은 조작 가능한 작은 컨트롤과 겹치는 작업면의 경계를 설명할 때만 사용한다.

- **`--radius-control: 0.625rem`:** 검증 투표 버튼과 지도 위 플로팅 컨트롤.
- **`--radius-dialog: 0.75rem`:** 데스크톱·모바일 다이얼로그 본체.
- **`--radius-sheet: 1rem`:** 모바일 하단 시트의 위쪽 모서리. 데스크톱 상세 원장은 `rounded-none`이다.
- **`--radius-pill: 9999px`:** 검증 상태, 카테고리 필터, 원형 마커처럼 의미상 캡슐 또는 원형인 요소에만 사용한다.
- 기본 구분선은 `--line`, 강한 상호작용 경계는 `--line-strong`을 우선한다. 기존 TSX의 `border-stone-300`/`stone-500` 사용은 현재 구현과 공존하지만, 새 코드에서는 의미 토큰을 우선한다.

## Components

### Search rail and list

탐색 레일은 로고, 인증 상태, 검색, 카테고리, 위치 행동, 결과 목록의 순서를 유지한다. 결과는 카드 모음이 아니라 폭 전체를 쓰는 행이며 `border-bottom`으로 나눈다. 선택 행은 `--trust-soft`, hover 행은 `--paper-hover`를 쓴다. 빈 상태는 점선 테두리와 해결 방법을 함께 표시한다.

### Buttons and controls

- **주요 행동:** `--trust` 배경과 흰색 텍스트. hover는 `--trust-strong`.
- **보조 행동:** 투명 배경, 1px 선, 먹색 또는 신뢰 녹색 텍스트.
- **위험 행동:** `--danger` 또는 옅은 위험 배경과 위험 텍스트.
- **비활성:** 전역 `button:disabled`의 `opacity: 0.52`와 `not-allowed` 커서를 유지한다.
- 아이콘만으로 의미가 불명확한 행동은 `내 위치`, `리뷰 작성`, `문제 신고`, `정보 수정`처럼 직접적인 한국어 레이블을 함께 쓴다.

### Verification ledger

`VerificationPanel`이 대표 컴포넌트다. 상단은 제목·설명과 상태 배지, 중단은 `정확해요 / 잘못됐어요 / 찬성률` 3열 집계, 하단은 두 투표 버튼과 자격 안내로 구성한다. 상태 클래스는 `.verification-state--pending`, `.verification-state--verified`, `.verification-state--inaccurate`다. 투표 선택은 `aria-pressed="true"`와 채운 상태색을 함께 사용한다. 관리자 조정은 `.verification-admin-note`로 출처를 명시한다.

### Map markers

마커의 본체 색은 카테고리, 3px 외곽선과 우상단 배지는 검증 상태를 나타낸다. `Clock3`, `BadgeCheck`, `TriangleAlert`가 확인 중·확정·부정확을 보조한다. 선택 마커는 36px에서 42px로 커지고 `--shadow-marker-selected`를 사용한다. 신고 또는 신고 수 3건 이상은 별도 적색 경고 배지를 추가한다. 신규 등록 좌표는 `--trust` 원형 `+` 마커다.

### Inputs and forms

필드는 흰 배경, 1px 선, 직각 형태, `text-sm`을 기본으로 한다. 선택 사항은 플레이스홀더와 인접 설명으로 구분하고 오류는 `.form-error` 또는 위험색 문장으로 필드 가까이에 둔다. 제출 직후 상태가 `확인 중`임을 등록 전에 설명한다. 사진 목록은 3열 썸네일과 명시적 제거 버튼을 사용한다.

### Dialogs, sheets, and navigation

다이얼로그는 `role="dialog"`, `aria-modal="true"`, 제목 기반 레이블과 명시적 `닫기`를 제공한다. 모바일에서는 하단에, 데스크톱에서는 중앙에 놓인다. 상세·내 제보는 모바일 하단 시트, 데스크톱 오른쪽 원장으로 바뀐다. 브라우저 뒤로가기와 `Escape`는 선택 상세를 닫고, 상세 시트는 `[`/`]` 단축키로 단계를 조절한다.

### Accessibility and motion

- 전역 키보드 포커스는 `3px solid color-mix(in srgb, var(--trust) 36%, transparent)`, `outline-offset: 2px`다.
- 상태는 색, 텍스트, 아이콘을 함께 사용한다. 장식 아이콘은 `aria-hidden`, 선택형 투표는 `aria-pressed`, 현재 탭은 `aria-current="page"`를 쓴다.
- 검증 버튼 최소 높이는 42px이고 지도 메뉴 버튼은 44×44px다.
- 상태 전환은 `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`과 180ms를 기본으로 한다. 마커는 160ms, 지도 포커스 이동은 0.28초다. 모션은 상태·공간 변화 설명에만 사용하며 반복 장식 애니메이션을 만들지 않는다.
- 현재 `prefers-reduced-motion` 전역 규칙은 없다. 새 비필수 모션을 추가할 때는 감소 모션 대안을 함께 구현해야 하며, 기존 값을 토큰 없이 확장하지 않는다.

## Do's and Don'ts

### Do

- **Do** 지도, 현재 검증 상태, 다음 행동을 같은 첫 화면에서 읽게 한다.
- **Do** 정적 정보 그룹은 `--line` 기반 행과 열로 나누고, 숫자는 `tabular-nums`로 맞춘다.
- **Do** `--trust`·`--pending`·`--danger`를 각각 확정·확인 중·정확하지 않음의 의미로 고정한다.
- **Do** 미검증 정보도 노출하되 상태 레이블, 기준, 현재 표 수를 함께 제공한다.
- **Do** 모바일에서 지도 맥락을 보존하고 상세는 세 단계 시트로 제공한다.
- **Do** 오류·빈 상태마다 사용자가 바로 실행할 재시도 또는 조건 변경 문구를 둔다.

### Don't

- **Don't** 정보 구획마다 둥근 흰 카드와 부드러운 그림자를 반복하지 않는다. 행, 헤어라인, 연속 작업면을 먼저 사용한다.
- **Don't** 그라데이션, 유리 효과, 무지갯빛 장식, 의미 없는 큰 아이콘이나 이모지로 공공 데이터 화면을 꾸미지 않는다.
- **Don't** pill을 기본 버튼 모양으로 쓰지 않는다. 상태, 필터, 원형 마커처럼 캡슐 형태의 의미가 있을 때만 `--radius-pill`을 사용한다.
- **Don't** 신뢰 색을 단순 장식이나 카테고리 구분에 재사용하지 않는다.
- **Don't** 지도 위에 마케팅 hero, 떠 있는 통계 카드, 행동 없는 요약 카드를 추가하지 않는다.
- **Don't** 상태를 색만으로 표시하거나 아이콘만 있는 행동을 레이블 없이 추가하지 않는다.

### 새 UI 추가 체크리스트

- [ ] 첫 작업은 지도 탐색, 검증 이해, 제보·투표 중 무엇인지 하나로 설명할 수 있는가?
- [ ] 새 면이 정말 겹치는가? 아니라면 `--shadow-*` 없이 `--line`과 종이 토큰으로 구조화했는가?
- [ ] 색은 `--paper*`, `--ink*`, `--trust*`, `--pending*`, `--danger*`, `--category-*` 중 실제 의미 토큰을 사용했는가?
- [ ] 반경은 `--radius-control`, `--radius-dialog`, `--radius-sheet`, `--radius-pill` 중 의미에 맞는 것만 사용했는가?
- [ ] 데스크톱 `21.25rem / 지도 / 24.375rem` 구조와 모바일 드로어·3단 시트·하단 탭을 깨지 않는가?
- [ ] 48rem 전후와 420px 이하에서 텍스트, 조작, 지도 맥락을 확인했는가?
- [ ] 상태를 한국어 레이블·아이콘·색으로 중복 표현하고 포커스, disabled, 오류, 빈 상태를 구현했는가?
- [ ] 새 간격·색·그림자·모션 값을 임의로 만들기 전에 기존 토큰과 Tailwind 리듬을 재사용했는가?
- [ ] 불필요한 카드, pill, 그라데이션, 장식 애니메이션, 과장된 카피가 없는가?
- [ ] 데스크톱과 모바일 실제 화면을 캡처해 원장 정렬, 시트 겹침, 하단 탭 충돌을 검수했는가?
