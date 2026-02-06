# SafetyWallet MVP Completion Plan

## TL;DR

> **Quick Summary**: P0 Critical Issues 13개 + QR 스캐너(P1)를 해결하여 MVP 출시를 완료합니다. Worker App 사진 업로드, 카테고리별 필수 필드, 랭킹 표시와 Admin App siteId 수정, 대시보드 확장, Security 인증/감사 로그를 병렬 Wave로 실행합니다.
>
> **Deliverables**:
>
> - Worker App: 사진 업로드, QR 스캐너, 카테고리 폼, 랭킹 카드, 불안전행동 경고
> - Admin App: 출근/투표 siteId 수정, 설정 API 연동, 대시보드 통계, 심사 필터
> - API: FAS 인증, Rate Limiting KV 전환, 감사 로그 7종 완성
>
> **Estimated Effort**: Large (14 Tasks, ~20-30 hours)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (Photo Upload) → Task 3 (Category Fields) → Task 5 (Unsafe Warning)

---

## Context

### Original Request

SafetyWallet MVP 완성을 위해 PRD v1.2 대비 분석 결과에서 도출된 P0 Critical Issues 13개와 P1 QR 스캐너를 해결하는 병렬 실행 가능한 작업 계획 수립.

### Interview Summary

**Key Discussions**:

- P0 13개 + P1 QR 스캐너만 MVP 범위에 포함
- 테스트 인프라 없음 → QA 시나리오 검증으로 대체
- 카테고리별 필수 필드는 PRD Section 5.2에 정의됨
- 감사 로그 7종은 PRD Appendix B에 정의됨
- 불안전행동 경고 문구는 PRD에서 제공됨

**Research Findings**:

- `posts.ts:256-311`: R2 이미지 업로드 패턴 구현됨 (FormData → R2.put)
- `join/page.tsx:100-112`: QR 스캐너 placeholder ("준비 중" toast)
- `attendance/page.tsx:25`: Admin siteId가 useState(null)로 하드코딩됨
- `votes/page.tsx:28`: 동일한 siteId null 패턴
- `settings/page.tsx`: 모든 값이 로컬 state, API 연동 없음
- `rate-limit.ts`: Durable Objects 사용 시도하나 실제 DO 클래스 미구현
- `auditLogs`: 41개 사용처 발견, 대부분 구현됨

### Self-Analysis (Metis 대체)

**Identified Gaps** (addressed):

- Admin App siteId: `useAuthStore((s) => s.currentSiteId)`로 변경 필요 (useSiteStore 미존재)
- Rate Limiting: DO 미구현 → KV 기반으로 전환 (simpler, MVP에 충분)
- 감사 로그: 현재 구현된 것과 PRD 7종 비교 필요

---

## Work Objectives

### Core Objective

PRD v1.2에서 정의된 MVP 기능을 100% 구현하여 출시 차단 이슈를 해결한다.

### Concrete Deliverables

- `apps/worker-app/src/app/posts/new/page.tsx`: 사진 업로드 + 카테고리별 필드
- `apps/worker-app/src/app/join/page.tsx`: QR 스캐너 컴포넌트
- `apps/worker-app/src/app/home/page.tsx`: 랭킹 카드 추가
- `apps/worker-app/src/app/points/page.tsx`: 랭킹 카드 추가
- `apps/worker-app/src/components/unsafe-warning-modal.tsx`: 경고 팝업
- `apps/admin-app/src/app/attendance/page.tsx`: siteId 동적 로드
- `apps/admin-app/src/app/votes/page.tsx`: siteId 동적 로드
- `apps/admin-app/src/app/settings/page.tsx`: API 연동
- `apps/admin-app/src/app/dashboard/page.tsx`: 4개 통계 카드 추가
- `apps/admin-app/src/app/posts/page.tsx`: 필터 확장
- `apps/api-worker/src/routes/fas.ts`: 인증 미들웨어 추가
- `apps/api-worker/src/routes/attendance.ts`: 인증 미들웨어 추가
- `apps/api-worker/src/middleware/rate-limit.ts`: KV 기반으로 전환
- `apps/api-worker/src/routes/admin.ts`: 감사 로그 완성

### Definition of Done

- [ ] `npm run build` 전체 성공 (apps/_, packages/_)
- [ ] `npx tsc --noEmit` 타입 에러 0
- [ ] 각 Task의 QA 시나리오 통과

### Must Have

- 사진 업로드가 R2에 저장되고 게시물에 연결됨
- 카테고리별 필수 필드가 동적으로 표시됨
- QR 스캐너가 카메라 접근 후 코드 인식 가능
- Admin App에서 siteId가 정상적으로 로드됨
- FAS API 엔드포인트에 인증 필요

### Must NOT Have (Guardrails)

- `as any`, `as unknown as` 추가 금지
- `confirm()`, `alert()` 사용 금지 (toast/modal 사용)
- 새로운 패턴 도입 금지 (기존 패턴 따름)
- P1 나머지 작업 (대시보드 확장 제외한 포인트 정책 UI, DO Rate Limiting, 조치 관리, 알림 시스템)
- 테스트 인프라 구축

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> 모든 검증은 에이전트가 직접 수행. 빌드/타입체크 + Playwright UI 검증.

### Test Decision

- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: N/A

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

각 Task에 포함된 QA 시나리오는 에이전트가 직접 실행합니다:

- **Frontend/UI**: Playwright로 브라우저 열고, 폼 작성, 버튼 클릭, DOM 검증, 스크린샷
- **API**: curl로 요청 전송, 응답 검증
- **Build**: `npm run build` 실행, exit code 0 확인

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately) - 독립 작업:
├── Task 1: Worker Photo Upload (API 이미 존재)
├── Task 6: Admin Attendance siteId Fix
├── Task 7: Admin Votes siteId Fix
├── Task 10: Admin Dashboard Stats
└── Task 12: API FAS Authentication

Wave 2 (After Wave 1):
├── Task 2: Worker QR Scanner (독립)
├── Task 4: Worker Ranking Display (독립)
├── Task 8: Admin Settings API (독립)
├── Task 11: Admin Posts Filter (독립)
└── Task 13: API Rate Limiting KV

Wave 3 (After Photo Upload):
├── Task 3: Worker Category Fields (depends: 1 - photo required logic)
└── Task 14: API Audit Logs

Wave 4 (After Category Fields):
└── Task 5: Worker Unsafe Warning (depends: 3 - shown on unsafe category)

Critical Path: Task 1 → Task 3 → Task 5
Parallel Speedup: ~60% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks       | Can Parallelize With |
| ---- | ---------- | ------------ | -------------------- |
| 1    | None       | 3            | 6, 7, 10, 12         |
| 2    | None       | None         | 4, 8, 11, 13         |
| 3    | 1          | 5            | 14                   |
| 4    | None       | None         | 2, 8, 11, 13         |
| 5    | 3          | None (final) | None                 |
| 6    | None       | None         | 1, 7, 10, 12         |
| 7    | None       | None         | 1, 6, 10, 12         |
| 8    | None       | None         | 2, 4, 11, 13         |
| 10   | None       | None         | 1, 6, 7, 12          |
| 11   | None       | None         | 2, 4, 8, 13          |
| 12   | None       | None         | 1, 6, 7, 10          |
| 13   | None       | None         | 2, 4, 8, 11          |
| 14   | None       | None         | 3                    |

### Agent Dispatch Summary

| Wave | Tasks           | Recommended Dispatch                                        |
| ---- | --------------- | ----------------------------------------------------------- |
| 1    | 1, 6, 7, 10, 12 | 5 parallel agents (quick category for siteId fixes)         |
| 2    | 2, 4, 8, 11, 13 | 5 parallel agents (frontend-ui-ux for QR, quick for others) |
| 3    | 3, 14           | 2 parallel agents (visual-engineering for category fields)  |
| 4    | 5               | 1 agent (quick category - modal component)                  |

---

## TODOs

### Wave 1: Independent Tasks (Start Immediately)

- [ ] 1. Worker App - Photo Upload 구현

  **What to do**:
  - `posts/new/page.tsx`에서 사진 버튼을 실제 file input으로 교체
  - 선택된 파일 미리보기 (썸네일) 표시
  - `lib/api.ts`의 apiFetch에 FormData 지원 추가 (Content-Type 헤더 조건부 제거)
  - 폼 제출 시 `POST /posts` 후 `POST /posts/:id/images`로 이미지 업로드
  - 다중 이미지 지원 (최대 5장)

  **Must NOT do**:
  - 이미지 압축/리사이징 (그대로 업로드)
  - 새로운 상태 관리 패턴 도입

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 파일 업로드 UI + API 연동 복합 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 파일 선택 UI, 미리보기 구현

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 6, 7, 10, 12)
  - **Blocks**: Task 3 (Category Fields needs photo required logic)
  - **Blocked By**: None

  **References**:
  - `apps/api-worker/src/routes/posts.ts:256-311` - R2 이미지 업로드 API 패턴 (FormData, contentType 검증, R2.put)
  - `apps/worker-app/src/app/posts/new/page.tsx:153-164` - 현재 placeholder 버튼 위치
  - `apps/worker-app/src/hooks/use-api.ts:32-45` - useCreatePost 훅 패턴
  - `apps/worker-app/src/lib/api.ts:15-18` - apiFetch 함수 (⚠️ Content-Type 하드코딩됨 → FormData 사용 시 헤더 제거 필요)

  **Acceptance Criteria**:
  - [ ] 사진 버튼 클릭 시 파일 선택 다이얼로그 열림
  - [ ] 선택된 파일 썸네일 미리보기 표시
  - [ ] 제출 시 이미지가 R2에 업로드됨
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 사진 선택 및 미리보기 표시
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000, user logged in
    Steps:
      1. Navigate to: http://localhost:3000/posts/new
      2. Wait for: button containing "사진" visible (timeout: 5s)
      3. Click: input[type="file"] (hidden, trigger via label click)
      4. Upload: test image file (create fixture)
      5. Assert: img[alt="preview"] visible
      6. Screenshot: .sisyphus/evidence/task-1-photo-preview.png
    Expected Result: 이미지 썸네일이 표시됨
    Evidence: .sisyphus/evidence/task-1-photo-preview.png

  Scenario: 사진과 함께 제보 제출
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user logged in, has site membership
    Steps:
      1. Navigate to: http://localhost:3000/posts/new
      2. Select category: 위험요소
      3. Fill: textarea → "테스트 제보 내용"
      4. Upload: test image
      5. Click: button[type="submit"]
      6. Wait for: navigation to /posts (timeout: 10s)
      7. Assert: URL is /posts
    Expected Result: 제보가 성공적으로 생성됨
    Evidence: .sisyphus/evidence/task-1-submit-success.png
  ```

  **Commit**: YES
  - Message: `feat(worker): implement photo upload with R2 integration`
  - Files: `apps/worker-app/src/app/posts/new/page.tsx`, `apps/worker-app/src/lib/api.ts`
  - Pre-commit: `npm run build`

---

- [ ] 6. Admin App - Attendance siteId Fix

  **What to do**:
  - `attendance/page.tsx`에서 `useState(null)`을 `useAuthStore((s) => s.currentSiteId)`로 교체
  - siteId가 없을 때 현장 선택 UI 표시
  - API 쿼리가 siteId 있을 때만 실행되도록 유지

  **Must NOT do**:
  - 새로운 상태 관리 패턴 도입
  - 하드코딩된 siteId 사용
  - `useSiteStore` 사용 (존재하지 않음)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 상태 연결 작업 (10-15줄 수정)
  - **Skills**: []
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 7, 10, 12)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/admin-app/src/app/attendance/page.tsx:25` - 현재 `const [siteId] = useState<string | null>(null);`
  - `apps/admin-app/src/stores/auth.ts:20,51` - `currentSiteId` 필드와 `setSiteId` 메서드 존재
  - `apps/admin-app/src/hooks/use-api.ts:84-90` - useDashboardStats에서 `useAuthStore((s) => s.currentSiteId)` 패턴 사용 중

  **Acceptance Criteria**:
  - [ ] siteId가 store/URL에서 동적으로 로드됨
  - [ ] 출근 목록 데이터가 표시됨
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 출근 현황 페이지 로드
    Tool: Playwright (playwright skill)
    Preconditions: Admin app on localhost:3001, admin logged in, site selected
    Steps:
      1. Navigate to: http://localhost:3001/attendance
      2. Wait for: h1 contains "출근 현황" (timeout: 5s)
      3. Assert: "현장을 선택해주세요" 메시지 NOT visible (siteId 있을 때)
      4. Assert: 출근 목록 또는 "오늘 출근 기록이 없습니다" 표시
      5. Screenshot: .sisyphus/evidence/task-6-attendance-loaded.png
    Expected Result: 페이지가 정상 로드되고 데이터 표시
    Evidence: .sisyphus/evidence/task-6-attendance-loaded.png
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `fix(admin): load siteId dynamically in attendance/votes pages`
  - Files: `apps/admin-app/src/app/attendance/page.tsx`
  - Pre-commit: `npm run build`

---

- [ ] 7. Admin App - Votes siteId Fix

  **What to do**:
  - `votes/page.tsx`에서 `useState(null)`을 `useAuthStore((s) => s.currentSiteId)`로 교체
  - Task 6과 동일한 패턴 적용
  - siteId가 없을 때 현장 선택 UI 표시

  **Must NOT do**:
  - 새로운 상태 관리 패턴 도입
  - 하드코딩된 siteId 사용
  - `useSiteStore` 사용 (존재하지 않음)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Task 6과 동일한 단순 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 6, 10, 12)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/admin-app/src/app/votes/page.tsx:28` - 현재 `const [siteId] = useState<string | null>(null);`
  - `apps/admin-app/src/stores/auth.ts:20,51` - `currentSiteId` 필드와 `setSiteId` 메서드 존재
  - `apps/admin-app/src/hooks/use-api.ts:84-90` - useDashboardStats에서 `useAuthStore((s) => s.currentSiteId)` 패턴 사용 중
  - Task 6 결과 - 동일 패턴 적용

  **Acceptance Criteria**:
  - [ ] siteId가 동적으로 로드됨
  - [ ] 투표 결과가 표시됨
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 투표 결과 페이지 로드
    Tool: Playwright (playwright skill)
    Preconditions: Admin app on localhost:3001, admin logged in, site selected
    Steps:
      1. Navigate to: http://localhost:3001/votes
      2. Wait for: h1 contains "우수 근로자 투표" (timeout: 5s)
      3. Assert: "현장을 선택해주세요" 메시지 NOT visible
      4. Screenshot: .sisyphus/evidence/task-7-votes-loaded.png
    Expected Result: 투표 결과 페이지 정상 로드
    Evidence: .sisyphus/evidence/task-7-votes-loaded.png
  ```

  **Commit**: YES (groups with Task 6)
  - Message: `fix(admin): load siteId dynamically in attendance/votes pages`
  - Files: `apps/admin-app/src/app/votes/page.tsx`
  - Pre-commit: `npm run build`

---

- [ ] 10. Admin App - Dashboard Stats 확장

  **What to do**:
  - 4개 추가 통계 카드 구현:
    - 백로그 (미처리 제보 수)
    - 긴급 제보 수
    - 평균 처리 시간
    - 카테고리별 차트 (pie/bar)
  - 필요시 API 확장 (`/admin/stats`)

  **Must NOT do**:
  - 복잡한 차트 라이브러리 도입 (recharts만 사용)
  - 실시간 업데이트

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 통계 시각화 + API 연동
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 차트 레이아웃, 카드 디자인

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 6, 7, 12)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/admin-app/src/app/dashboard/page.tsx:29-49` - 현재 4개 StatsCard
  - `apps/admin-app/src/components/stats-card.tsx` - StatsCard 컴포넌트 패턴
  - `apps/admin-app/src/hooks/use-api.ts` - useDashboardStats 훅
  - `apps/api-worker/src/routes/admin.ts` - admin stats endpoint (확장 필요시)

  **Acceptance Criteria**:
  - [ ] 8개 통계 카드 표시 (기존 4 + 신규 4)
  - [ ] 카테고리 차트 렌더링
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 확장된 대시보드 통계 표시
    Tool: Playwright (playwright skill)
    Preconditions: Admin app on localhost:3001, admin logged in
    Steps:
      1. Navigate to: http://localhost:3001/dashboard
      2. Wait for: h1 contains "대시보드" (timeout: 5s)
      3. Assert: 8 cards with stats visible
      4. Assert: chart/graph element visible (category breakdown)
      5. Screenshot: .sisyphus/evidence/task-10-dashboard-stats.png
    Expected Result: 모든 통계 카드와 차트 표시
    Evidence: .sisyphus/evidence/task-10-dashboard-stats.png
  ```

  **Commit**: YES
  - Message: `feat(admin): add backlog, urgent, avg time, category chart to dashboard`
  - Files: `apps/admin-app/src/app/dashboard/page.tsx`, `apps/api-worker/src/routes/admin.ts` (if needed)
  - Pre-commit: `npm run build`

---

- [ ] 12. API - FAS Authentication 추가

  **What to do**:
  - `/fas/workers/sync`와 `/attendance/sync`에 인증 미들웨어 추가
  - API Key 방식으로 검증 구현 (`X-FAS-API-Key` 헤더)
  - `wrangler.toml`에 `FAS_API_KEY` 환경 변수 추가
  - 기존 FAS 호출에서 인증 헤더 추가 필요

  **Must NOT do**:
  - 기존 authMiddleware 사용 (user session용)
  - 복잡한 OAuth 구현

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 미들웨어 추가 단순 작업
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 6, 7, 10)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/api-worker/src/routes/fas.ts:30` - `/workers/sync` 엔드포인트 (인증 없음)
  - `apps/api-worker/src/routes/attendance.ts:81` - `/sync` 엔드포인트 (인증 없음)
  - `apps/api-worker/src/middleware/auth.ts` - 기존 JWT 미들웨어 (참조용)
  - `apps/api-worker/wrangler.toml` - FAS_API_KEY 환경 변수 추가 필요

  **Acceptance Criteria**:
  - [ ] 인증 없이 `/fas/workers/sync` 호출 시 401 반환
  - [ ] 올바른 API Key로 호출 시 정상 동작
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: FAS API 무인증 요청 거부
    Tool: Bash (curl)
    Preconditions: API worker running
    Steps:
      1. curl -X POST http://localhost:8787/fas/workers/sync \
           -H "Content-Type: application/json" \
           -d '{"workers":[]}'
      2. Assert: HTTP status 401
      3. Assert: response contains "UNAUTHORIZED"
    Expected Result: 인증 없이 접근 거부
    Evidence: Response body captured

  Scenario: FAS API 인증된 요청 성공
    Tool: Bash (curl)
    Preconditions: API worker running, FAS_API_KEY set
    Steps:
      1. curl -X POST http://localhost:8787/fas/workers/sync \
           -H "Content-Type: application/json" \
           -H "X-FAS-API-Key: $FAS_API_KEY" \
           -d '{"workers":[]}'
      2. Assert: HTTP status 200
      3. Assert: response.success is true
    Expected Result: 인증된 요청 성공
    Evidence: Response body captured
  ```

  **Commit**: YES
  - Message: `feat(api): add API key authentication to FAS endpoints`
  - Files: `apps/api-worker/src/routes/fas.ts`, `apps/api-worker/src/routes/attendance.ts`, `apps/api-worker/src/middleware/fas-auth.ts`
  - Pre-commit: `npm run build`

---

### Wave 2: Second Independent Batch

- [ ] 2. Worker App - QR Scanner 구현

  **What to do**:
  - html5-qrcode 또는 @yudiel/react-qr-scanner 라이브러리 설치
  - `join/page.tsx`에서 QR 스캔 버튼 클릭 시 스캐너 모달 열기
  - 카메라 접근 권한 요청 처리
  - QR 코드 인식 시 자동으로 joinCode 입력

  **Must NOT do**:
  - Native 앱 의존성
  - 자체 QR 디코딩 구현

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 카메라 API + 모달 UI 복합 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 스캐너 UI, 모달 디자인

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 8, 11, 13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/worker-app/src/app/join/page.tsx:100-112` - 현재 placeholder 버튼
  - npm: `html5-qrcode` 또는 `@yudiel/react-qr-scanner` - QR 스캐너 라이브러리
  - `packages/ui/src/components/alert-dialog.tsx` - AlertDialog 컴포넌트 존재 (모달용)

  **Acceptance Criteria**:
  - [ ] QR 스캔 버튼 클릭 시 카메라 스캐너 모달 열림
  - [ ] QR 코드 인식 시 코드가 입력 필드에 자동 입력
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: QR 스캐너 모달 열기
    Tool: Playwright (playwright skill)
    Preconditions: Worker app on localhost:3000, user logged in
    Steps:
      1. Navigate to: http://localhost:3000/join
      2. Click: button contains "QR 코드 스캔"
      3. Wait for: dialog/modal visible (timeout: 5s)
      4. Assert: video element or canvas for camera feed
      5. Screenshot: .sisyphus/evidence/task-2-qr-scanner-modal.png
    Expected Result: 스캐너 모달이 열리고 카메라 피드 표시
    Evidence: .sisyphus/evidence/task-2-qr-scanner-modal.png

  Scenario: 카메라 권한 거부 처리
    Tool: Playwright (playwright skill)
    Preconditions: Camera permission denied in browser
    Steps:
      1. Navigate to: http://localhost:3000/join
      2. Click: button contains "QR 코드 스캔"
      3. Wait for: error message visible (timeout: 5s)
      4. Assert: error text contains "카메라" or "권한"
    Expected Result: 권한 거부 시 적절한 에러 메시지
    Evidence: Error message captured
  ```

  **Commit**: YES
  - Message: `feat(worker): implement QR code scanner for site join`
  - Files: `apps/worker-app/src/app/join/page.tsx`, `apps/worker-app/src/components/qr-scanner.tsx`, `apps/worker-app/package.json`
  - Pre-commit: `npm run build`

---

- [ ] 4. Worker App - Ranking Display 추가

  **What to do**:
  - 홈 페이지와 포인트 페이지에 랭킹 카드 컴포넌트 추가
  - `/points/leaderboard/:siteId` API 호출
  - Top 3 + 내 순위 표시

  **Must NOT do**:
  - 복잡한 애니메이션
  - 무한 스크롤

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: API 존재, UI 컴포넌트만 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 8, 11, 13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/api-worker/src/routes/points.ts:214-272` - leaderboard API (이미 구현됨)
  - `apps/worker-app/src/app/home/page.tsx:77-82` - PointsCard 위치 (랭킹 카드 추가)
  - `apps/worker-app/src/app/points/page.tsx:25-26` - PointsCard 위치
  - `apps/worker-app/src/components/points-card.tsx` - 기존 카드 컴포넌트 패턴
  - `apps/worker-app/src/hooks/use-api.ts` - ⚠️ `useLeaderboard` 훅 미존재 → 새로 생성 필요 (usePointsHistory 패턴 참고)

  **Acceptance Criteria**:
  - [ ] `useLeaderboard` 훅 생성 (hooks/use-api.ts)
  - [ ] 홈 페이지에 랭킹 카드 표시
  - [ ] 포인트 페이지에 랭킹 카드 표시
  - [ ] Top 3 + 내 순위 표시
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 홈 페이지 랭킹 카드 표시
    Tool: Playwright (playwright skill)
    Preconditions: Worker app on localhost:3000, user logged in, has site membership
    Steps:
      1. Navigate to: http://localhost:3000/home
      2. Wait for: page loaded (timeout: 5s)
      3. Assert: element containing "랭킹" or "순위" visible
      4. Assert: at least 1 rank entry visible (1위, 2위, etc.)
      5. Screenshot: .sisyphus/evidence/task-4-ranking-home.png
    Expected Result: 랭킹 카드가 홈 페이지에 표시됨
    Evidence: .sisyphus/evidence/task-4-ranking-home.png
  ```

  **Commit**: YES
  - Message: `feat(worker): add ranking card to home and points pages`
  - Files: `apps/worker-app/src/app/home/page.tsx`, `apps/worker-app/src/app/points/page.tsx`, `apps/worker-app/src/components/ranking-card.tsx`
  - Pre-commit: `npm run build`

---

- [ ] 8. Admin App - Settings API 연동

  **What to do**:
  - 설정 페이지의 값을 API에서 로드/저장
  - `/sites/:id/settings` GET/PATCH 엔드포인트 사용 또는 생성
  - 새로고침 후에도 값 유지

  **Must NOT do**:
  - 로컬 스토리지 사용 (API 연동 필수)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CRUD 연동 단순 작업
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 11, 13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/admin-app/src/app/settings/page.tsx` - 현재 로컬 state만 사용
  - `apps/api-worker/src/routes/sites.ts` - sites API (settings 확장 필요)

  **Acceptance Criteria**:
  - [ ] 페이지 로드 시 API에서 설정 값 로드
  - [ ] 설정 변경 시 API에 저장
  - [ ] 새로고침 후 값 유지
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 설정 저장 및 새로고침 후 유지
    Tool: Playwright (playwright skill)
    Preconditions: Admin app on localhost:3001, admin logged in
    Steps:
      1. Navigate to: http://localhost:3001/settings
      2. Change: 포인트 설정 값을 200으로 변경
      3. Click: 저장 버튼 (또는 auto-save)
      4. Wait for: success toast or save confirmation
      5. Reload: page
      6. Assert: 포인트 설정 값이 200으로 유지됨
      7. Screenshot: .sisyphus/evidence/task-8-settings-persisted.png
    Expected Result: 설정이 API에 저장되고 새로고침 후 유지
    Evidence: .sisyphus/evidence/task-8-settings-persisted.png
  ```

  **Commit**: YES
  - Message: `feat(admin): connect settings page to API`
  - Files: `apps/admin-app/src/app/settings/page.tsx`, `apps/api-worker/src/routes/sites.ts` (if needed)
  - Pre-commit: `npm run build`

---

- [ ] 11. Admin App - Posts Filter 확장

  **What to do**:
  - 제보 관리 페이지에 필터 추가:
    - 현장/회사/직종/카테고리/위험도/날짜 범위
  - 서버 사이드 필터링 (API 쿼리 파라미터)

  **Must NOT do**:
  - 클라이언트 사이드 필터링 (데이터 많을 수 있음)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 필터 UI + API 연동
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 필터 드롭다운/칩 디자인

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 8, 13)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/admin-app/src/app/posts/page.tsx:80-103` - 현재 status 필터만 존재
  - `apps/api-worker/src/routes/admin.ts` - admin posts API (필터 파라미터 확장 필요)

  **Acceptance Criteria**:
  - [ ] 6개 필터 옵션 UI 표시
  - [ ] 필터 적용 시 결과 업데이트
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 카테고리 필터 적용
    Tool: Playwright (playwright skill)
    Preconditions: Admin app on localhost:3001, admin logged in, posts exist
    Steps:
      1. Navigate to: http://localhost:3001/posts
      2. Click: 카테고리 필터 드롭다운
      3. Select: "위험요소"
      4. Wait for: table refresh (timeout: 5s)
      5. Assert: all visible rows have category = 위험요소
      6. Screenshot: .sisyphus/evidence/task-11-category-filter.png
    Expected Result: 필터가 적용되어 결과가 필터링됨
    Evidence: .sisyphus/evidence/task-11-category-filter.png
  ```

  **Commit**: YES
  - Message: `feat(admin): add comprehensive filters to posts page`
  - Files: `apps/admin-app/src/app/posts/page.tsx`, `apps/api-worker/src/routes/admin.ts`
  - Pre-commit: `npm run build`

---

- [ ] 13. API - Rate Limiting KV 전환

  **What to do**:
  - 현재 Durable Objects 시도 → KV Namespace 기반으로 전환
  - KV에 `rate:{key}` 형태로 카운터 저장
  - TTL 활용하여 자동 만료

  **Must NOT do**:
  - Durable Objects 완전 구현 (복잡, MVP 이후)
  - 메모리 기반 유지 (Workers 재시작 시 초기화)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 미들웨어 단순 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 8, 11)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/api-worker/src/middleware/rate-limit.ts` - 현재 DO 기반 시도
  - `apps/api-worker/wrangler.toml` - KV namespace 바인딩 (RATE_LIMIT_KV 추가)
  - Cloudflare KV docs - TTL 기반 만료

  **Acceptance Criteria**:
  - [ ] Rate limiting이 KV 기반으로 동작
  - [ ] Workers 재시작 후에도 rate limit 유지
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Rate limit 적용 확인
    Tool: Bash (curl)
    Preconditions: API worker running with KV binding
    Steps:
      1. Loop 10 times: curl -X POST /auth/login with invalid credentials
      2. Assert: after 5 requests, status 429 returned
      3. Assert: X-RateLimit-Remaining header decreases
    Expected Result: Rate limiting이 정상 동작
    Evidence: Response headers captured
  ```

  **Commit**: YES
  - Message: `feat(api): switch rate limiting from DO to KV namespace`
  - Files: `apps/api-worker/src/middleware/rate-limit.ts`, `apps/api-worker/wrangler.toml`
  - Pre-commit: `npm run build`

---

### Wave 3: Dependent on Photo Upload

- [ ] 3. Worker App - Category Fields 구현

  **What to do**:
  - 카테고리 선택에 따라 동적 필드 표시:
    - HAZARD: Type(select), Immediate action(toggle), Suggestion(text), Photo(required)
    - UNSAFE_BEHAVIOR: Behavior type(select), Photo(required)
    - INCONVENIENCE: Type(select), Frequency(select), Photo(optional)
    - SUGGESTION: Type(select), Expected benefit(text), Contact consent(toggle), Photo(optional)
    - BEST_PRACTICE: Before/After photos, Description(text)
  - 카테고리별 사진 필수 여부 적용

  **Must NOT do**:
  - 새로운 DTO 생성 (기존 CreatePostDto 확장)
  - 복잡한 폼 라이브러리 도입

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 동적 폼 UI 복잡도
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 동적 폼 UX, 조건부 렌더링

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 14)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 5 (Unsafe Warning needs category detection)
  - **Blocked By**: Task 1 (Photo upload must work first)

  **References**:
  - `apps/worker-app/src/app/posts/new/page.tsx:93-116` - 현재 riskLevel만 조건부 표시
  - PRD Section 5.2 - 카테고리별 필수 필드 정의
  - `packages/types/src/enums.ts` - Category, RiskLevel 등

  **Acceptance Criteria**:
  - [ ] 카테고리 선택 시 해당 필드만 표시
  - [ ] 필수 필드 미입력 시 제출 버튼 비활성화
  - [ ] HAZARD, UNSAFE_BEHAVIOR 선택 시 사진 필수
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: HAZARD 카테고리 선택 시 필드 표시
    Tool: Playwright (playwright skill)
    Preconditions: Worker app on localhost:3000, user logged in
    Steps:
      1. Navigate to: http://localhost:3000/posts/new
      2. Click: 위험요소 카테고리 버튼
      3. Assert: "유형" select visible (Fall/Drop/Pinch 등)
      4. Assert: "즉시 조치 가능" toggle visible
      5. Assert: 사진 필수 표시 ("*" or "필수")
      6. Screenshot: .sisyphus/evidence/task-3-hazard-fields.png
    Expected Result: HAZARD 카테고리 필드가 동적으로 표시됨
    Evidence: .sisyphus/evidence/task-3-hazard-fields.png

  Scenario: 사진 필수 카테고리에서 사진 없이 제출 시도
    Tool: Playwright (playwright skill)
    Steps:
      1. Select: HAZARD category
      2. Fill: 내용
      3. Assert: submit button disabled (사진 없음)
      4. Upload: 사진
      5. Assert: submit button enabled
    Expected Result: 사진 필수 검증 동작
    Evidence: Button state captured
  ```

  **Commit**: YES
  - Message: `feat(worker): implement category-specific form fields per PRD`
  - Files: `apps/worker-app/src/app/posts/new/page.tsx`, `packages/types/src/post.dto.ts` (if needed)
  - Pre-commit: `npm run build`

---

- [ ] 14. API - Audit Logs 완성

  **What to do**:
  - PRD Appendix B 7종 감사 로그 완전 구현:
    1. PII full view - 이미 구현됨 (확인 필요)
    2. Excel download - admin.ts에서 추가
    3. Image download - admin.ts에서 추가
    4. Point award/adjust - points.ts에서 추가
    5. Policy change - sites.ts settings에서 추가
    6. Permission change - admin.ts에서 추가
    7. Forced status change - 이미 구현됨 (확인 필요)

  **Must NOT do**:
  - 기존 감사 로그 구조 변경 (필드 추가만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 기존 패턴 따라 insert 추가
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/api-worker/src/db/schema.ts:372-400` - auditLogs 테이블 스키마
  - `apps/api-worker/src/routes/admin.ts` - 기존 감사 로그 insert 패턴 (200, 231, 342 등)
  - PRD Appendix B - 7종 필수 감사 로그

  **Acceptance Criteria**:
  - [ ] 7종 감사 로그 모두 기록됨
  - [ ] 각 로그에 필수 필드 포함 (actor, timestamp, ip 등)
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Point award 감사 로그 기록 확인
    Tool: Bash (curl)
    Preconditions: API running, admin authenticated
    Steps:
      1. POST /points/award with valid data
      2. GET /admin/audit-logs?action=POINT_AWARD
      3. Assert: log entry exists with actor, user, amount, reason
    Expected Result: 포인트 지급 감사 로그 기록됨
    Evidence: Response body captured
  ```

  **Commit**: YES
  - Message: `feat(api): complete all 7 mandatory audit log types per PRD`
  - Files: `apps/api-worker/src/routes/admin.ts`, `apps/api-worker/src/routes/points.ts`, `apps/api-worker/src/routes/sites.ts`
  - Pre-commit: `npm run build`

---

### Wave 4: Final Dependent Task

- [ ] 5. Worker App - Unsafe Behavior Warning 구현

  **What to do**:
  - UNSAFE_BEHAVIOR 카테고리 선택 시 경고 배너 표시
  - 제출 전 확인 모달 표시
  - 경고 문구: "이것은 개인 처벌이 아닌 개선 목적입니다. 얼굴/개인정보가 노출되지 않도록 주의하세요."

  **Must NOT do**:
  - `confirm()` 사용 (modal 컴포넌트 사용)
  - 경고 문구 임의 수정

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 모달 컴포넌트 + 조건부 렌더링
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 3 (category detection logic)

  **References**:
  - `apps/worker-app/src/app/posts/new/page.tsx` - 폼 위치
  - `packages/ui/src/components/alert-dialog.tsx` - AlertDialog 컴포넌트 존재 (확인 모달용)
  - PRD Section 5.2 line 257 - 경고 문구 원문

  **Acceptance Criteria**:
  - [ ] UNSAFE_BEHAVIOR 선택 시 경고 배너 표시
  - [ ] 제출 시 확인 모달 표시
  - [ ] 모달에서 확인 후 제출 진행
  - [ ] `npm run build` 성공

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 불안전행동 카테고리 경고 표시
    Tool: Playwright (playwright skill)
    Preconditions: Worker app on localhost:3000, user logged in
    Steps:
      1. Navigate to: http://localhost:3000/posts/new
      2. Click: 불안전행동 카테고리 버튼
      3. Assert: warning banner visible
      4. Assert: banner text contains "개인 처벌이 아닌 개선 목적"
      5. Screenshot: .sisyphus/evidence/task-5-unsafe-warning-banner.png
    Expected Result: 경고 배너가 표시됨
    Evidence: .sisyphus/evidence/task-5-unsafe-warning-banner.png

  Scenario: 제출 시 확인 모달 표시
    Tool: Playwright (playwright skill)
    Steps:
      1. Select: UNSAFE_BEHAVIOR category
      2. Fill: required fields
      3. Upload: photo
      4. Click: submit button
      5. Assert: confirmation dialog visible
      6. Assert: dialog text contains "얼굴/개인정보"
      7. Click: 확인 button in dialog
      8. Wait for: navigation to /posts
    Expected Result: 확인 모달 후 제출 진행
    Evidence: .sisyphus/evidence/task-5-confirm-modal.png
  ```

  **Commit**: YES
  - Message: `feat(worker): add unsafe behavior warning banner and confirmation modal`
  - Files: `apps/worker-app/src/app/posts/new/page.tsx`, `apps/worker-app/src/components/unsafe-warning-modal.tsx`
  - Pre-commit: `npm run build`

---

## Commit Strategy

| After Task(s) | Message                                                    | Files                                            | Verification  |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------ | ------------- |
| 1             | `feat(worker): implement photo upload with R2 integration` | posts/new/page.tsx, lib/api.ts                   | npm run build |
| 2             | `feat(worker): implement QR code scanner for site join`    | join/page.tsx, components/qr-scanner.tsx         | npm run build |
| 3             | `feat(worker): implement category-specific form fields`    | posts/new/page.tsx                               | npm run build |
| 4             | `feat(worker): add ranking card to home and points pages`  | home/page.tsx, points/page.tsx, ranking-card.tsx | npm run build |
| 5             | `feat(worker): add unsafe behavior warning`                | posts/new/page.tsx, unsafe-warning-modal.tsx     | npm run build |
| 6, 7          | `fix(admin): load siteId dynamically in attendance/votes`  | attendance/page.tsx, votes/page.tsx              | npm run build |
| 8             | `feat(admin): connect settings page to API`                | settings/page.tsx                                | npm run build |
| 10            | `feat(admin): add dashboard stats cards and chart`         | dashboard/page.tsx                               | npm run build |
| 11            | `feat(admin): add comprehensive filters to posts page`     | posts/page.tsx                                   | npm run build |
| 12            | `feat(api): add API key authentication to FAS endpoints`   | fas.ts, attendance.ts, middleware/fas-auth.ts    | npm run build |
| 13            | `feat(api): switch rate limiting to KV namespace`          | middleware/rate-limit.ts, wrangler.toml          | npm run build |
| 14            | `feat(api): complete all 7 mandatory audit log types`      | admin.ts, points.ts, sites.ts                    | npm run build |

---

## Success Criteria

### Verification Commands

```bash
# 전체 빌드 검증
npm run build  # Expected: exit 0, no errors

# 타입 체크
npx tsc --noEmit  # Expected: exit 0, no type errors

# Worker App 실행
npm run dev:worker  # Expected: localhost:3000 accessible

# Admin App 실행
npm run dev:admin  # Expected: localhost:3001 accessible

# API Worker 실행
npm run dev:api  # Expected: localhost:8787 accessible
```

### Final Checklist

- [ ] All 14 tasks completed and verified
- [ ] All "Must Have" features present
- [ ] All "Must NOT Have" patterns absent
- [ ] `npm run build` passes for all apps
- [ ] No TypeScript errors
- [ ] No `as any`, `as unknown as` added
- [ ] No `confirm()`, `alert()` added
- [ ] All QA scenarios pass

---

## Gap Resolution Summary

### Auto-Resolved (minor gaps fixed):

- Admin siteId pattern: Use existing `useAuthStore((s) => s.currentSiteId)` (auth.ts:20,51에 존재)
- Rate Limiting: Simplified to KV-based (DO too complex for MVP)
- Audit logs: Extend existing pattern, don't restructure
- FormData support: `lib/api.ts:15-18` Content-Type 조건부 제거 필요
- useLeaderboard hook: `hooks/use-api.ts`에 새로 생성 필요

### Defaults Applied (override if needed):

- QR library: html5-qrcode (lightweight, no native deps)
- Chart library for dashboard: recharts (if not already in project)
- Settings API: Extend sites.ts with /settings endpoint
- Modal component: AlertDialog (`packages/ui/src/components/alert-dialog.tsx` 사용)

### Decisions Made:

- P1 QR Scanner promoted to MVP scope
- P1 remaining items explicitly excluded from this plan
- `useSiteStore` 미존재 확인 → `useAuthStore` 패턴 사용

---

_Plan generated: 2026-02-06_
_Version: 1.1_
_Total Tasks: 14_
_Estimated Waves: 4_
_Reviewed: Momus review completed - all references verified_
