# Tasks: Article Category System

**Input**: Design documents from `/specs/001-article-categories/`  
**Branch**: `001-article-categories`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Organization**: Tasks are grouped by user story (P1, P2, P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and migration preparation

- [x] T001 Create migration script for existing lessons at scripts/migrate-lessons-categories.js
- [x] T002 [P] Verify MongoDB version supports transactions (4.0+) - document in specs/001-article-categories/MIGRATION.md
- [x] T003 [P] Review existing vocabulary categories pattern at pages/admin/dashboard/categories.js for reference

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data models that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create ArticleCategory model with Vietnamese slug generation at lib/models/ArticleCategory.js
- [x] T005 [P] Modify Lesson schema to add category field (required: false initially) at lib/models/Lesson.js
- [x] T006 Add compound indexes for category filtering to Lesson model at lib/models/Lesson.js
- [x] T007 Test ArticleCategory model validation rules (name, slug, description length limits)
- [x] T008 Run migration script to create default category and assign to existing lessons
- [x] T009 Update Lesson schema to set category field as required: true at lib/models/Lesson.js
- [x] T010 Verify all lessons have category assigned via MongoDB query

**Checkpoint**: Foundation ready - all lessons have categories, models defined

---

## Phase 3: User Story 1 - Admin Creates and Manages Categories (Priority: P1) 🎯 MVP

**Goal**: Administrators can create, read, update, and delete article categories with full CRUD operations. System prevents deletion of default "Chưa phân loại" category.

**Independent Test**: Admin logs into dashboard, navigates to category management, creates "Ngữ pháp" category, edits its name, tries to delete default category (should fail), deletes a test category with articles (should reassign to default), verifies all operations via UI and database.

### Implementation for User Story 1

**Backend API (Category CRUD)**

- [x] T011 [P] [US1] Implement GET /api/article-categories handler at pages/api/article-categories/index.js
- [x] T012 [P] [US1] Implement POST /api/article-categories handler with duplicate name check at pages/api/article-categories/index.js
- [x] T013 [P] [US1] Implement PUT /api/article-categories handler at pages/api/article-categories/index.js
- [x] T014 [US1] Implement DELETE /api/article-categories handler with transaction support at pages/api/article-categories/index.js
- [x] T015 [US1] Add ensureDefaultCategory() helper function to API route at pages/api/article-categories/index.js
- [x] T016 [US1] Add authentication middleware check (admin only) to all mutating operations at pages/api/article-categories/index.js
- [x] T017 [US1] Test DELETE endpoint reassigns articles to default category correctly

**Admin UI (Category Management Page)**

- [x] T018 [P] [US1] Create article category management page at pages/admin/dashboard/article-categories.js
- [x] T019 [US1] Implement category list view with article counts at pages/admin/dashboard/article-categories.js
- [x] T020 [US1] Add "Create New Category" form with name, description, slug fields at pages/admin/dashboard/article-categories.js
- [x] T021 [US1] Implement inline edit mode for category name and description at pages/admin/dashboard/article-categories.js
- [x] T022 [US1] Add delete button with confirmation dialog showing article count at pages/admin/dashboard/article-categories.js
- [x] T023 [US1] Disable delete button for system categories (isSystem: true) at pages/admin/dashboard/article-categories.js
- [x] T024 [US1] Add active/inactive toggle for categories at pages/admin/dashboard/article-categories.js
- [x] T025 [US1] Display success/error toasts for all operations at pages/admin/dashboard/article-categories.js
- [x] T026 [US1] Add loading states for API calls at pages/admin/dashboard/article-categories.js

**Admin Navigation**

- [x] T027 [US1] Add "Quản lý danh mục bài viết" link to admin dashboard navigation at pages/admin/dashboard/index.js

**Validation & Error Handling**

- [x] T028 [US1] Test duplicate category name prevention (case-insensitive)
- [x] T029 [US1] Test Vietnamese character slug generation ("Ngữ pháp" → "ngu-phap")
- [x] T030 [US1] Test system category deletion prevention
- [x] T031 [US1] Test category deletion with articles reassigns to default
- [x] T032 [US1] Test empty/whitespace-only category name rejection

**Checkpoint**: At this point, User Story 1 should be fully functional - admin can manage categories independently

---

## Phase 4: User Story 2 - Admin Assigns Categories to Articles (Priority: P2)

**Goal**: Administrators can assign one category to each article/lesson. Articles default to "Chưa phân loại" if no category selected. Bulk category reassignment supported.

**Independent Test**: Admin edits an existing lesson, sees category dropdown with all active categories, assigns "Ngữ pháp" category, saves, verifies category shows in lesson list. Admin creates new lesson without selecting category, verifies it defaults to "Chưa phân loại". Admin bulk-edits multiple lessons to change categories.

### Implementation for User Story 2

**Backend API (Lesson Category Assignment)**

- [x] T033 [P] [US2] Modify POST /api/lessons to require category field (default to system category if not provided) at pages/api/lessons.js
- [x] T034 [P] [US2] Modify PUT /api/lessons/{id} to support category updates at pages/api/lessons/[id].js
- [x] T035 [US2] Add GET /api/lessons to populate category field in response at pages/api/lessons.js
- [x] T036 [US2] Test lesson creation without category defaults to "Chưa phân loại"
- [x] T037 [US2] Test lesson category assignment via PUT endpoint

**Admin UI (Lesson Category Assignment)**

- [x] T038 [P] [US2] Add category dropdown to lesson edit form at pages/admin/dashboard/lesson/[id]/index.js (or equivalent)
- [x] T039 [US2] Fetch active categories list for dropdown options
- [x] T040 [US2] Display current category in lesson edit form
- [x] T041 [US2] Save category selection with lesson updates
- [x] T042 [US2] Show category tag/label in lesson list view at pages/admin/dashboard/index.js
- [x] T043 [US2] Add bulk edit UI for changing categories of multiple lessons

**Integration with User Story 1**

- [x] T044 [US2] Test that deleting a category (US1) correctly updates affected lessons to default category
- [x] T045 [US2] Test that inactive categories don't appear in lesson edit dropdown

**Checkpoint**: At this point, User Stories 1 AND 2 work independently - categories can be managed and assigned to lessons

---

## Phase 5: User Story 3 - Users Browse and Filter by Category (Priority: P3)

**Goal**: End users can see category filters on article listing page, click a category to filter articles, see category tags on individual articles, and bookmark filtered URLs.

**Independent Test**: User visits homepage, sees category filter showing "Ngữ pháp (23)", "Từ vựng (15)", clicks "Ngữ pháp", sees only grammar articles, URL shows ?category=ngu-phap, user bookmarks URL and returns later to same filtered view. User clicks category tag on individual article, navigates to filtered view.

### Implementation for User Story 3

**Backend API (Category Filtering)**

- [x] T046 [P] [US3] Add category query parameter support to GET /api/lessons at pages/api/lessons.js
- [x] T047 [US3] Implement slug-to-ObjectId lookup for category filtering at pages/api/lessons.js
- [x] T048 [US3] Test filtering by category slug returns correct lessons
- [x] T049 [US3] Test filtering by non-existent category returns 404 or empty result
- [x] T050 [US3] Add pagination support for category-filtered results at pages/api/lessons.js

**Frontend UI (Category Filter Component)**

- [x] T051 [P] [US3] Create CategoryFilter component at components/CategoryFilter.jsx
- [x] T052 [US3] Fetch active categories with article counts in CategoryFilter
- [x] T053 [US3] Display category buttons with counts (e.g., "Ngữ pháp (23)")
- [x] T054 [US3] Add "Tất cả" (All) button to show all articles
- [x] T055 [US3] Highlight currently selected category
- [x] T056 [US3] Handle category click to update URL query parameter (?category=slug)
- [x] T057 [US3] Add loading state while fetching categories

**Frontend UI (Homepage Integration)**

- [x] T058 [US3] Import and add CategoryFilter component to homepage at pages/index.js
- [x] T059 [US3] Read category query parameter from router in homepage
- [x] T060 [US3] Pass category to lesson fetching API call
- [x] T061 [US3] Display filtered lesson results on homepage
- [x] T062 [US3] Handle URL changes (back/forward buttons) for category filtering
- [x] T063 [US3] Add empty state when category has no articles

**Frontend UI (Article Detail Category Tag)**

- [x] T064 [P] [US3] Display category tag on individual lesson pages at pages/[lessonId].js
- [x] T065 [US3] Make category tag clickable to navigate to filtered view
- [x] T066 [US3] Style category tag consistently with design system

**Testing & Edge Cases**

- [x] T067 [US3] Test URL bookmarking preserves category filter
- [x] T068 [US3] Test switching between categories updates results correctly
- [x] T069 [US3] Test "Tất cả" clears category filter
- [x] T070 [US3] Test category filter works with existing difficulty filters (beginner/experienced)
- [x] T071 [US3] Test pagination with category filtering

**Checkpoint**: All user stories complete - full category system functional end-to-end

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T072 [P] Add Vietnamese translations for all category UI strings to public/locales/vi/common.json
- [x] T073 [P] Add caching headers to GET /api/article-categories endpoint (5 min TTL)
- [x] T074 [P] Optimize article count aggregation with MongoDB aggregation pipeline
- [x] T075 [P] Add CSS styling for category filter and tags to styles/adminDashboard.module.css
- [x] T076 Document category system usage in README.md or docs/CATEGORIES.md
- [x] T077 Test all scenarios from quickstart.md validation checklist
- [x] T078 Code cleanup: Remove console.logs, add consistent error messages
- [x] T079 [P] Add SEO meta tags for category-filtered pages
- [x] T080 Performance audit: Test with 50 categories and ensure <2s response time

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (P1) can start immediately after Foundational
  - US2 (P2) can start immediately after Foundational (independent of US1 API, but integrates in testing)
  - US3 (P3) can start immediately after Foundational (independent of US1/US2, but needs categories to exist for demo)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Integrates with US1 (category deletion test) but core functionality is independent
- **User Story 3 (P3)**: Can start after Foundational - Works best with categories created (US1) and assigned (US2) but technically independent

### Within Each User Story

**US1 Internal Order**:
- Backend API tasks (T011-T017) can mostly run in parallel [P]
- Admin UI tasks depend on API being functional
- Navigation task (T027) can run any time
- Validation tasks (T028-T032) run after implementation

**US2 Internal Order**:
- Backend API tasks (T033-T035) can run in parallel [P]
- Admin UI tasks (T038-T043) depend on API being functional
- Integration tests (T044-T045) run after both US1 and US2 implementation

**US3 Internal Order**:
- Backend API tasks (T046-T050) can run in parallel [P]
- CategoryFilter component (T051-T057) can develop independently
- Homepage integration (T058-T063) depends on CategoryFilter component
- Article detail tags (T064-T066) can run in parallel [P]
- Testing tasks (T067-T071) run after implementation

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T004 (ArticleCategory model) and T005 (Lesson modification) can run in parallel [P]
- T006 (indexes) must wait for T005
- T007-T010 are sequential verification steps

**Phase 3 (US1)**:
- All backend API handlers (T011-T014) can develop in parallel [P]
- UI components (T018-T026) can start once T011 (GET endpoint) is ready
- Validation tests can run in parallel after implementation

**Phase 4 (US2)**:
- Backend tasks T033-T035 can run in parallel [P]
- UI tasks T038-T043 can run in parallel [P] once API is ready

**Phase 5 (US3)**:
- Backend tasks T046-T050 can run in parallel [P]
- CategoryFilter component (T051) and article detail tags (T064-T066) can develop in parallel
- Testing tasks can run in parallel after implementation

**Phase 6 (Polish)**:
- Almost all polish tasks (T072-T075, T079) can run in parallel [P]

---

## Parallel Example: User Story 1

```bash
# Launch all backend API handlers together:
Task T011: "Implement GET /api/article-categories handler"
Task T012: "Implement POST /api/article-categories handler"  
Task T013: "Implement PUT /api/article-categories handler"
Task T014: "Implement DELETE /api/article-categories handler"

# While backend is building, can work on frontend in parallel:
Task T018: "Create article category management page structure"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended

1. **Complete Phase 1**: Setup (T001-T003) - ~30 min
2. **Complete Phase 2**: Foundational (T004-T010) - ~2 hours
3. **Complete Phase 3**: User Story 1 (T011-T032) - ~2-3 hours
4. **STOP and VALIDATE**: 
   - Admin can create categories ✓
   - Admin can edit categories ✓
   - Admin can delete categories (with reassignment) ✓
   - Cannot delete default category ✓
   - Vietnamese slugs work correctly ✓
5. **Deploy/demo MVP** - Category management fully functional

**Total MVP Time**: ~4-6 hours

### Incremental Delivery (MVP + Enhancements)

1. **MVP (US1)**: Category management - ~4-6 hours
2. **Add US2**: Category assignment - ~2-3 hours
   - Test independently: Can assign categories to articles ✓
   - Deploy/demo with US1+US2
3. **Add US3**: User filtering - ~2-3 hours
   - Test independently: Users can filter articles ✓
   - Deploy/demo complete system
4. **Add Polish**: Final touches - ~1-2 hours

**Total Complete System**: ~9-14 hours (matches quickstart estimate of 6-8 hours for focused implementation)

### Parallel Team Strategy

With 2 developers after Foundational phase:

**Developer A**:
- Phase 3 (US1): Category CRUD backend + admin UI
- Phase 6: Backend polish tasks

**Developer B**:
- Phase 4 (US2): Category assignment
- Phase 5 (US3): User filtering UI
- Phase 6: Frontend polish tasks

Stories integrate at Phase 4 (T044-T045 integration tests).

**Timeline**: ~6-8 hours with parallel work

---

## Task Summary

- **Total Tasks**: 80 tasks
- **Setup Phase**: 3 tasks
- **Foundational Phase**: 7 tasks (CRITICAL - blocks all stories)
- **User Story 1 (P1)**: 22 tasks - MVP increment
- **User Story 2 (P2)**: 13 tasks - Assignment increment
- **User Story 3 (P3)**: 26 tasks - Filtering increment
- **Polish Phase**: 9 tasks

### Tasks by Type

- **Backend API**: ~18 tasks
- **Frontend UI**: ~31 tasks
- **Data Models**: 4 tasks
- **Migration**: 4 tasks
- **Testing/Validation**: ~15 tasks
- **Polish**: ~8 tasks

### Parallel Opportunities

- **Parallelizable tasks marked [P]**: ~28 tasks
- **Stories can run in parallel**: US1, US2, US3 (after Foundational)
- **Max concurrent work streams**: 3-4 developers can work simultaneously after Phase 2

---

## Validation Checklist

Before marking a user story complete:

**User Story 1 (P1) - Category Management**:
- [ ] Admin can create category with Vietnamese name
- [ ] Slug auto-generates correctly (ngu-phap-duc)
- [ ] Admin can edit category name and description
- [ ] Admin can toggle category active/inactive
- [ ] Cannot delete system category "Chưa phân loại"
- [ ] Deleting category with articles reassigns to default
- [ ] Duplicate category names are rejected (case-insensitive)
- [ ] Category list shows article counts

**User Story 2 (P2) - Category Assignment**:
- [ ] Admin can assign category when creating lesson
- [ ] Admin can change category when editing lesson
- [ ] New lessons default to "Chưa phân loại"
- [ ] Lesson list shows category tags
- [ ] Bulk edit can reassign multiple lessons
- [ ] Only active categories appear in dropdown
- [ ] Deleting category updates affected lessons

**User Story 3 (P3) - User Filtering**:
- [ ] Homepage shows category filter with counts
- [ ] Clicking category filters article list
- [ ] URL contains category parameter (bookmarkable)
- [ ] "Tất cả" button clears filter
- [ ] Category tag on article is clickable
- [ ] Empty state when category has no articles
- [ ] Filter works with pagination
- [ ] Filter works with difficulty filter

**Overall System**:
- [ ] All lessons have a category (no orphans)
- [ ] Default category cannot be deleted
- [ ] Vietnamese characters in slugs work correctly
- [ ] All admin operations require authentication
- [ ] Response times meet performance goals (<2s filtering, <500ms admin ops)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story (US1, US2, US3)
- **Tests are OPTIONAL**: No dedicated test files generated (project has limited test infrastructure)
- **Validation instead of tests**: Each story has validation checkpoints
- **Migration is CRITICAL**: Must run before deploying (Phase 2, T008)
- **Transaction support**: Verify MongoDB version 4.0+ for atomic delete+reassign
- **Vietnamese support**: Slug generation is key for proper URL encoding
- **Each user story is independently testable**: Can deploy after any story completion
- **Commit frequently**: After each task or logical group
- **Stop at checkpoints**: Validate story works independently before proceeding
