# 사용자 매뉴얼 커버리지 매트릭스

상태는 `covered`, `documented-limitation`, `out-of-scope`만 사용합니다.

| ID | 역할 | 화면·기능 | 상태 | 문서·증거 |
| --- | --- | --- | --- | --- |
| HOME-01 | 방문자 | 데스크톱 홈 작업면 | covered | [02](./02-map-and-search.md), `02-home-desktop.png` |
| HOME-02 | 방문자 | 모바일 홈 작업면 | covered | [02](./02-map-and-search.md), `02-home-mobile.png` |
| HOME-03 | 방문자 | 검색어 필터 | covered | [02](./02-map-and-search.md) |
| HOME-04 | 방문자 | 분류 필터 | covered | [02](./02-map-and-search.md) |
| HOME-05 | 방문자 | 검색 결과 없음 | covered | [02](./02-map-and-search.md), `02-search-empty.png` |
| HOME-06 | 방문자 | 목록 조회 실패·재시도 | covered | [02](./02-map-and-search.md), [09](./09-qa-and-recovery.md) |
| MAP-01 | 방문자 | 지도 이동·확대·마커 선택 | covered | [02](./02-map-and-search.md) |
| MAP-02 | 방문자 | 브라우저 위치 권한 | documented-limitation | [02](./02-map-and-search.md): 외부 브라우저 UI |
| MAP-03 | 방문자 | 지도 타일 장애 | covered | [02](./02-map-and-search.md), [09](./09-qa-and-recovery.md) |
| NAV-01 | 방문자 | URL 검색·선택·시트 복원 | covered | [01](./01-system-and-roles.md), [02](./02-map-and-search.md) |
| NAV-02 | 방문자 | 모바일 메뉴·하단 탭 | covered | [02](./02-map-and-search.md), `02-home-mobile.png` |
| DETAIL-01 | 방문자 | 위치 상세 열람 | covered | [03](./03-location-and-verification.md) |
| DETAIL-02 | 방문자 | 확인 중 상태 | covered | [03](./03-location-and-verification.md), `03-location-pending.png` |
| DETAIL-03 | 방문자 | 확정 상태 | covered | [03](./03-location-and-verification.md), `03-location-verified-mobile.png` |
| DETAIL-04 | 방문자 | 정확하지 않음 상태 | covered | [03](./03-location-and-verification.md) |
| DETAIL-05 | 방문자 | 상세 조회 실패·재시도 | covered | [03](./03-location-and-verification.md), `03-location-load-failure.png` |
| VOTE-01 | 로그인 사용자 | 정확 투표 | covered | [03](./03-location-and-verification.md) |
| VOTE-02 | 로그인 사용자 | 잘못 투표 | covered | [03](./03-location-and-verification.md) |
| VOTE-03 | 로그인 사용자 | 투표 선택 변경 | covered | [03](./03-location-and-verification.md), [09](./09-qa-and-recovery.md) |
| VOTE-04 | 작성자 | 자기 제보 투표 차단 | covered | [03](./03-location-and-verification.md), [09](./09-qa-and-recovery.md) |
| VOTE-05 | 관리자 | 검증 상태 수동 조정 | covered | [03](./03-location-and-verification.md), [08](./08-admin-operations.md) |
| REG-01 | 로그인 사용자 | 위치 선택·등록 양식 | covered | [04](./04-register-location.md), `04-register-form.png` |
| REG-02 | 로그인 사용자 | Daum 주소 검색 팝업 | documented-limitation | [04](./04-register-location.md): 외부 팝업 UI |
| REG-03 | 로그인 사용자 | 사진 업로드 | covered | [04](./04-register-location.md), [09](./09-qa-and-recovery.md) |
| REG-04 | 로그인 사용자 | 50m 동일 분류 중복 | covered | [04](./04-register-location.md), `04-register-duplicate.png` |
| REG-05 | 로그인 사용자 | 일일·요청 제한 | covered | [04](./04-register-location.md), [09](./09-qa-and-recovery.md) |
| CONTRIB-01 | 로그인 사용자 | 리뷰 작성 | covered | [05](./05-reviews-reports-suggestions.md), `05-review-dialog.png` |
| CONTRIB-02 | 로그인 사용자 | 문제 신고 | covered | [05](./05-reviews-reports-suggestions.md), `05-report-dialog.png` |
| CONTRIB-03 | 로그인 사용자 | 정보 수정 제안 | covered | [05](./05-reviews-reports-suggestions.md), `05-suggestion-dialog.png` |
| MINE-01 | 작성자 | 내 제보 목록 | covered | [06](./06-my-reports.md), `06-my-reports.png` |
| MINE-02 | 작성자 | 제보 편집 | covered | [06](./06-my-reports.md), `06-edit-report.png` |
| MINE-03 | 작성자 | 편집 후 검증 초기화 | covered | [06](./06-my-reports.md), [09](./09-qa-and-recovery.md) |
| AUTH-01 | 방문자 | 테스트 계정 로그인 | covered | [07](./07-login-and-account.md), `07-login.png` |
| AUTH-02 | 방문자 | 잘못된 계정 정보 | covered | [07](./07-login-and-account.md), `07-login-error.png` |
| AUTH-03 | 방문자 | Google·Kakao·Naver 제공자 화면 | documented-limitation | [07](./07-login-and-account.md): 외부 제공자 UI |
| ACCOUNT-01 | 로그인 사용자 | 회원정보·빠른 이동·로그아웃 | covered | [07](./07-login-and-account.md), `07-account.png` |
| ADMIN-01 | 관리자 | 관리자 접근 제어 | covered | [08](./08-admin-operations.md), [09](./09-qa-and-recovery.md) |
| ADMIN-02 | 관리자 | 신고 필터·해결·기각 | covered | [08](./08-admin-operations.md), `08-admin-reports.png` |
| ADMIN-03 | 관리자 | 제안 필터·적용·기각 | covered | [08](./08-admin-operations.md), `08-admin-suggestions.png` |
| QA-01 | 운영자 | 자동 릴리스 검사 | covered | [09](./09-qa-and-recovery.md) |
| QA-02 | 운영자 | DB·지도·업로드 장애 복구 | covered | [09](./09-qa-and-recovery.md) |

## 집계

- 전체: 41
- covered: 38
- documented-limitation: 3
- out-of-scope: 0
- 미분류: 0
