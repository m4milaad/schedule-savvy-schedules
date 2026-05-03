# Codebase Quality Overhaul — Implementation Plan

A comprehensive plan covering TypeScript strictness, testing, linting, CI, Supabase RLS, code organization, and performance across the schedule-savvy-schedules monorepo (Vite/React frontend + FastAPI/Python RAG backend).

---

## User Review Required

> [!IMPORTANT]
> **This is a large plan with ~7 major workstreams and an estimated 80+ files touched.** I recommend tackling this in phases. Please confirm the priority ordering below — or if you'd like to defer any workstream.

> [!WARNING]
> **Supabase RLS changes** (Section 5) will be delivered as a new migration file. Existing migration files will NOT be modified — only audited and documented. The new migration will tighten overly-permissive policies. **This could break existing sessions if the app relies on permissive access.** Please confirm you're comfortable with this before I proceed.

> [!IMPORTANT]
> **`exactOptionalPropertyTypes`** is extremely strict and will flag every `useState<T | undefined>` initializer and every optional prop. Given the scale of this codebase (~100+ components), I recommend deferring it until after the other type errors are resolved, or scoping it to new code only via a separate tsconfig. Please advise.

## Open Questions

1. **Python virtual environment**: The project has a `.venv` directory. Should I install Python dev dependencies (pytest, ruff, mypy) into it, or do you use a different environment manager?
2. **pre-commit framework**: Should I use the `pre-commit` framework (`.pre-commit-config.yaml`) or just Husky + lint-staged? The request mentions both "pre-commit" for Python and Husky for JS — I'll use Husky/lint-staged for JS and a `.pre-commit-config.yaml` for Python, both wired into the same Husky hook.
3. **Vercel CI gating**: Vercel deployment can be gated via GitHub's "Required status checks" on the `main` branch. I'll document this in the CI workflow file rather than modifying Vercel settings directly. Is that acceptable?
4. **Component size threshold**: Several admin components are 600-1000 lines (e.g., `TeachersTab.tsx` at 34KB, `StudentCoursesTab.tsx` at 35KB). Splitting all of them is a massive refactor. Should I limit splitting to the **top 5 largest** files, or do you want every file over 300 lines split?

---

## Proposed Changes

### Phase 1 — TypeScript Strictness

#### [MODIFY] [tsconfig.app.json](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/tsconfig.app.json)
- Remove `"strictNullChecks": false` (redundant when `strict: true` — but currently overriding strict to disable null checks)
- Add `"noUncheckedIndexedAccess": true`
- Add `"exactOptionalPropertyTypes": true` *(pending your approval — see Open Questions)*
- `strict: true` is already set

#### [MODIFY] Multiple source files (estimated 40-60 files)
Fix all type errors that surface from enabling `strictNullChecks` + `noUncheckedIndexedAccess`:
- **Null guard patterns**: Add `if (!data) return;` guards, optional chaining, and nullish coalescing
- **Indexed access**: Add `undefined` checks after `Record<string, T>` lookups and array indexing
- **`as any` removal**: Replace all 45+ `as any` casts with proper types derived from Supabase generated types (`Database['public']['Tables']`)
- Particularly in: `seatingAlgorithm.ts` (5 `as any`), `StudentNoticesTab.tsx` (6 `as any`), `TeachersTab.tsx` (3 `as any`), `ManageAdminsTab.tsx`, `AdminProfileTab.tsx`, `useRealtimeNotifications.ts`

#### [NEW] [src/schemas/supabase.ts](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/schemas/supabase.ts)
- Zod schemas for all manually-typed Supabase responses
- Schemas for: `CourseTeacher`, `ExamScheduleItem`, `Holiday`, `Profile`, `Student`, `StudentEnrollment`, `SeatingResult`
- Zod `z.parse()` calls at data-fetching boundaries (in hooks/query functions)

---

### Phase 2 — Testing Setup (Frontend)

#### [MODIFY] [package.json](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/package.json)
- Add devDependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw` (for API mocking)
- Add script: `"test": "vitest"`, `"test:coverage": "vitest --coverage"`

#### [NEW] [vitest.config.ts](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/vitest.config.ts)
- Vitest config with jsdom environment, path aliases matching vite.config.ts

#### [NEW] [src/test/setup.ts](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/test/setup.ts)
- Test setup file importing `@testing-library/jest-dom`

#### [NEW] [src/utils/__tests__/scheduleAlgorithm.test.ts](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/utils/__tests__/scheduleAlgorithm.test.ts)
Full branch coverage tests:
- `calculateCoursePriority` — semester weighting, gap days, enrolled students, lab course penalty
- `mergeSimilarCourses` — single course, BT/BTCS merging, teacher name concatenation
- `hasStudentConflict` — conflict found / not found, normalized code matching
- `satisfiesGapRequirement` — gap satisfied, gap violated, no student dates
- `scheduleWithBacktracking` — successful scheduling, backtracking on conflict, daily limit (Friday vs weekday), already-scheduled skip
- `generateEnhancedSchedule` — end-to-end: correct sort, error on no valid dates, error on impossible constraints
- `generateOptimizedSchedule` — delegates correctly to enhanced

#### [NEW] [src/utils/__tests__/seatingAlgorithm.test.ts](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/utils/__tests__/seatingAlgorithm.test.ts)
Full branch coverage for `scatterStudentsIntoGrid`:
- Empty student list → all-null grid
- Single course fills all seats
- 2 courses produce alternating A-B pattern
- 3+ courses produce A-B-C round-robin
- Course runs out → fallback to next course
- All courses exhaust before grid full → partial fill
- Grid capacity exactly matches student count

Integration tests (mocking Supabase):
- `generateSeatingArrangement` — happy path, no exams, no students, no venues, department filtering
- `saveSeatingArrangement` — insert flow, delete+insert
- `getSavedSeatingArrangement` — reconstructs grid correctly

#### [NEW] Integration tests per role:
- [src/__tests__/integration/studentDashboard.test.tsx](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/__tests__/integration/studentDashboard.test.tsx) — renders tabs, displays course data, shows marks
- [src/__tests__/integration/teacherMarksEntry.test.tsx](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/__tests__/integration/teacherMarksEntry.test.tsx) — select course, enter marks, save mutation
- [src/__tests__/integration/adminScheduling.test.tsx](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/__tests__/integration/adminScheduling.test.tsx) — load courses, generate schedule, save to DB

---

### Phase 3 — Testing Setup (Python Backend)

#### [MODIFY] [backend/requirements.txt](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/backend/requirements.txt)
- Add: `pytest`, `pytest-cov`, `pytest-asyncio`, `ruff`, `mypy`

#### [NEW] [backend/tests/conftest.py](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/backend/tests/conftest.py)
- Shared fixtures: mock `Settings`, mock `SentenceTransformer`, sample metadata

#### [NEW] [backend/tests/test_chunking.py](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/backend/tests/test_chunking.py)
- Tests for `SparseIndex._build()` — tokenization, document frequency, average doc length
- Tests for `SparseIndex.search()` — BM25 scoring, empty queries, empty corpus

#### [NEW] [backend/tests/test_retrieval_ranking.py](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/backend/tests/test_retrieval_ranking.py)
- `_heuristic_score` — contact intent, table intent, entity overlap, noise penalty
- `_rrf_fuse` — dense-only, sparse-only, both, RRF score calculation
- `_rerank` — reranker score integration, source boost
- `_is_contact_intent`, `_is_allowed_source_url`, `_sanitize_source_url`

#### [NEW] [backend/tests/test_query_pipeline.py](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/backend/tests/test_query_pipeline.py)
- `rewrite_query` — pronoun resolution, no pronouns, disabled, no history
- End-to-end `retrieve()` with mocked FAISS index — confidence gating, mode selection
- API endpoint tests: `/chat`, `/search`, `/health` response shapes

---

### Phase 4 — Linting and Pre-commit Enforcement

#### [MODIFY] [eslint.config.js](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/eslint.config.js)
- Replace `tseslint.configs.recommended` with `tseslint.configs.recommendedTypeChecked` (strict)
- Add `eslint-plugin-jsx-a11y` with recommended config
- `eslint-plugin-react-hooks` is already installed and configured
- Add `parserOptions.project` pointing to `tsconfig.app.json` for type-aware rules

#### [MODIFY] [package.json](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/package.json)
- Add devDependencies: `eslint-plugin-jsx-a11y`, `husky`, `lint-staged`
- Add `"prepare": "husky"` script
- Add `lint-staged` config:
  ```json
  {
    "*.{ts,tsx}": ["eslint --fix", "tsc --noEmit --project tsconfig.app.json"],
    "*.py": ["ruff check --fix", "mypy"]
  }
  ```

#### [NEW] [.husky/pre-commit](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/.husky/pre-commit)
- `npx lint-staged`

#### [NEW] [backend/pyproject.toml](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/backend/pyproject.toml)
- `[tool.ruff]` config: `target-version = "py312"`, strict rules
- `[tool.mypy]` config: `strict = true`, per-module overrides for third-party libs
- `[tool.pytest.ini_options]`

#### [NEW] [.pre-commit-config.yaml](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/.pre-commit-config.yaml)
- Hooks for `ruff check`, `mypy`, wired into the Husky pre-commit flow

---

### Phase 5 — CI Pipeline

#### [NEW] [.github/workflows/ci.yml](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/.github/workflows/ci.yml)
Triggers: push/PR to `main`

**Frontend job:**
1. `npm ci`
2. `npx tsc --noEmit --project tsconfig.app.json`
3. `npm run lint`
4. `npx vitest run --coverage`

**Python job:**
1. `pip install -r backend/requirements.txt`
2. `ruff check backend/`
3. `mypy backend/ --config-file backend/pyproject.toml`
4. `pytest backend/tests/ -v --cov=backend`

**Deployment gating:**
- Add comment documenting that Vercel should be configured with "Required status checks" in GitHub branch protection for `main`

---

### Phase 6 — Supabase RLS Audit

#### Audit Findings (from migration review)

**Tables with blanket `USING (true)` policies (overly permissive):**

| Table | Migration | Issue |
|-------|-----------|-------|
| `holidays` | `20250629094045` | `FOR ALL USING (true) WITH CHECK (true)` — anyone can CRUD |
| `profiles` | `20251018065927` | `USING (true)` on some policies |
| `students` | `20251020065524` | Multiple `USING (true)` policies across SELECT/INSERT/UPDATE/DELETE |
| `teachers` | `20251020065524` | Multiple `USING (true)` policies |
| `courses` | `20251020065524` | `USING (true)` for all ops |
| `departments` | `20251020065524` | `USING (true)` |
| `schools` | `20251020065524` | `USING (true)` |
| `sessions` | `20251020065524` | `USING (true)` |
| `venues` | `20251020065524` | `USING (true)` |
| `datesheets` | `20251020065524` | `USING (true)` |
| `student_enrollments` | `20251020065524` | `USING (true)` |
| `notifications` | `20251019042418` | `USING (true)` |
| `teacher_courses` | `20251204022505` | `USING (true)` |
| `seat_assignments` | `20251222124657` | `USING (true)` |
| `user_roles` | `20251105050001` | `USING (true)` |
| `library_books` | `20260103062202` | `FOR SELECT USING (true)` (read is OK; writes need restriction) |

**Tables with proper role-based RLS (good):**
- `notices`, `student_marks`, `attendance`, `assignments`, `assignment_submissions`, `resources`, `leave_applications` (all in `20260103060012`)
- `audit_logs` (in `20251107043847`)
- `user_notifications` (in `20251222133038`)
- `book_issues`, `student_notice_reads`, `resource_bookmarks` (in `20260103062202`)

**Tables potentially missing RLS entirely:**
- `rag_documents` (created in `20260331190000`) — need to verify

#### [NEW] [supabase/migrations/20260502_tighten_rls_policies.sql](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/supabase/migrations/20260502_tighten_rls_policies.sql)

Replace blanket `true` policies with role-scoped policies:
- **`holidays`**: SELECT for all authenticated, INSERT/UPDATE/DELETE for admin/department_admin only
- **`students`**: SELECT own record (matching `auth.uid()` via profiles), admin full access
- **`courses`, `departments`, `schools`**: SELECT for all authenticated, mutations for admin/department_admin
- **`venues`, `sessions`, `datesheets`**: SELECT for all authenticated, mutations for admin/department_admin
- **`profiles`**: SELECT own, UPDATE own, admin full access
- **`teacher_courses`**: SELECT for teacher's own courses, admin full access
- **`seat_assignments`**: SELECT for all authenticated, mutations for admin/department_admin
- **`student_enrollments`**: Students read own, admin full access
- **`notifications`**: Read for all authenticated, write for admin
- **`user_roles`**: Read own, admin manages
- **`rag_documents`**: Enable RLS if missing, admin-only write, service-role read

> [!CAUTION]
> These policy changes are additive (DROP old + CREATE new). They WILL break access for any client-side code that relies on permissive access without proper auth context. The app already uses `auth.uid()` and `has_role()` in the well-structured policies, so the pattern is established.

---

### Phase 7 — Code Organization

#### Large component splits (top 5 by size):

| File | Lines | Split Plan |
|------|-------|------------|
| `StudentCoursesTab.tsx` (35KB) | ~800+ | → `CourseCard.tsx`, `CourseFilters.tsx`, `EnrollmentDialog.tsx` |
| `TeachersTab.tsx` (34KB) | ~800+ | → `TeacherTable.tsx`, `TeacherForm.tsx`, `TeacherCourseAssign.tsx` |
| `SeatingArrangement.tsx` (31KB) | ~700+ | → `SeatingGrid.tsx`, `SeatingControls.tsx`, `SeatingPrintView.tsx` |
| `StudentsTab.tsx` (30KB) | ~700+ | → `StudentTable.tsx`, `StudentForm.tsx`, `BulkActions.tsx` |
| `VenuesTab.tsx` (28KB) | ~650+ | → `VenueTable.tsx`, `VenueForm.tsx`, `VenueLayoutPreview.tsx` |

#### Data-fetching extraction:

#### [NEW] [src/queries/](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/queries/) directory
Move all inline Supabase queries from component `useEffect` bodies into dedicated query function files:
- `src/queries/students.ts` — student listing, enrollment, marks
- `src/queries/teachers.ts` — teacher listing, course assignment
- `src/queries/courses.ts` — course listing, schedules
- `src/queries/admin.ts` — venues, departments, schools, sessions
- `src/queries/attendance.ts` — attendance records
- `src/queries/notices.ts` — notice listing/management

These will use the existing `queryKeys.ts` pattern and be consumed by `useQuery`/`useMutation` in components.

#### useEffect + fetch deduplication:
- Identify repeated `useEffect(() => { supabase.from(...).select(...) }, [])` patterns in student/teacher/admin panels
- Replace with shared TanStack Query hooks that call the `src/queries/*` functions

---

### Phase 8 — Performance

#### Targeted query invalidation:
- Current `invalidateQueries` calls in `useStudents.ts` and `useSeatingAssignment.ts` already use `queryKeys.students.all` and `queryKeys.seatAssignments.all` — these are reasonably scoped
- Audit admin panel mutations (in `CoursesTab`, `TeachersTab`, `VenuesTab`, etc.) for broader invalidation patterns and narrow them

#### Server-side pagination:
- **Currently**: Only `AuditLogsTab.tsx` uses `.range()` — all other admin tables fetch unbounded result sets
- **Fix**: Add `.range(from, to)` with `usePagination` hook to:
  - `StudentsTab.tsx` — student listing
  - `TeachersTab.tsx` — teacher listing
  - `CoursesTab.tsx` — course listing
  - `MarksTab.tsx` — marks listing
  - `SeatingArrangement.tsx` — seat assignments

#### Chatbot error boundary and timeout:

#### [MODIFY] [src/lib/chatbot/retrieval.ts](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/lib/chatbot/retrieval.ts)
- Add `AbortController` with configurable timeout (e.g. 30s) to the `fetch` call to the Llama/RAG API
- Add proper error classification (timeout vs network vs API error)

#### [MODIFY] [src/pages/ChatbotAssistant.tsx](file:///c:/Users/LEGION/Documents/Development/schedule-savvy-schedules/src/pages/ChatbotAssistant.tsx)
- Wrap the chatbot in a dedicated `ErrorBoundary` with a user-friendly fallback UI
- The existing `ErrorBoundary` component at the app root is already present but too broad

---

## Verification Plan

### Automated Tests

```bash
# Frontend — type checking
npx tsc --noEmit --project tsconfig.app.json

# Frontend — lint
npm run lint

# Frontend — unit + integration tests
npx vitest run --coverage

# Python — lint
ruff check backend/

# Python — type check
mypy backend/ --config-file backend/pyproject.toml

# Python — tests
pytest backend/tests/ -v --cov=backend

# Full CI simulation
# Run the complete CI workflow locally using act or manually
```

### Manual Verification
- Run `npm run dev` and verify all pages load correctly (student, teacher, admin dashboards)
- Test login flows for each role
- Verify chatbot `/assistant` route works with timeout handling
- Confirm Husky pre-commit hooks fire on a test commit
- Review the RLS migration SQL before applying to Supabase

---

## Execution Priority

I recommend this order (dependencies flow top-down):

1. **Phase 2 + 3**: Testing setup (unlocks validation for everything else)
2. **Phase 1**: TypeScript strictness (fixes compound through all other phases)
3. **Phase 4**: Linting + pre-commit (enforces quality going forward)
4. **Phase 5**: CI pipeline (automated gate)
5. **Phase 7**: Code organization (refactoring with test safety net)
6. **Phase 8**: Performance (optimization with test safety net)
7. **Phase 6**: RLS audit (requires careful review, separate deployment)
