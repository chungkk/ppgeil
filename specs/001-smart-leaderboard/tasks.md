# Tasks: Smart Leaderboard Design

**Branch**: `001-smart-leaderboard` | **Generated**: 2024-12-02  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

| Metric | Value |
|--------|-------|
| Total Tasks | 42 |
| User Stories | 6 |
| Phases | 8 |
| Estimated Hours | 12-18 |

## User Story Mapping

| Story | Priority | Tasks | Description |
|-------|----------|-------|-------------|
| US1 | P1 | 6 | Xem bảng xếp hạng đa tiêu chí |
| US2 | P1 | 5 | Xem vị trí cá nhân và phân tích |
| US3 | P2 | 5 | Xem biểu đồ tiến bộ |
| US4 | P2 | 5 | Xem badges và achievements |
| US5 | P2 | 5 | Lọc leaderboard theo thời gian (weekly) |
| US6 | P3 | 6 | Xem leagues/divisions |

---

## Phase 1: Setup ✅

**Goal**: Initialize project structure and shared constants

- [x] T001 Create league constants file in `lib/constants/leagues.js`
- [x] T002 [P] Create components directory `components/leaderboard/`
- [x] T003 [P] Add i18n keys for leaderboard in `public/locales/{vi,en,de}/common.json`

---

## Phase 2: Foundational (Data Layer) ✅

**Goal**: Extend User model and create new models (blocking for all user stories)

- [x] T004 Extend User model with new fields (streak, totalTimeSpent, lessonsCompleted, weeklyPoints, currentLeague) in `models/User.js`
- [x] T005 [P] Add MongoDB indexes to User model for leaderboard queries in `models/User.js`
- [x] T006 [P] Create WeeklyLeaderboard model in `lib/models/WeeklyLeaderboard.js`
- [x] T007 [P] Create RankHistory model with TTL index in `lib/models/RankHistory.js`
- [x] T008 [P] Create UserBadge model in `lib/models/UserBadge.js`
- [x] T009 [P] Create UserLeague model in `lib/models/UserLeague.js`
- [x] T010 Create initialization script for existing users in `scripts/init-leaderboard-fields.js`

---

## Phase 3: User Story 1 - Đa tiêu chí ranking (P1) ✅

**Goal**: Users can view leaderboard sorted by different criteria (points, streak, time, lessons, improved)

**Independent Test**: Chuyển đổi giữa các tab ranking và xác nhận thứ hạng thay đổi theo tiêu chí

- [x] T011 [US1] Create by-criteria API endpoint in `pages/api/leaderboard/by-criteria.js`
- [x] T012 [P] [US1] Create RankingCriteriaTabs component in `components/leaderboard/RankingCriteriaTabs.js`
- [x] T013 [P] [US1] Create UserRankCard component for list items in `components/leaderboard/UserRankCard.js`
- [x] T014 [US1] Add criteria tabs styles in `styles/leaderboard.module.css`
- [x] T015 [US1] Integrate RankingCriteriaTabs into leaderboard page in `pages/leaderboard/index.js`
- [x] T016 [US1] Add SWR hooks for by-criteria endpoint in `pages/leaderboard/index.js`

---

## Phase 4: User Story 2 - Vị trí cá nhân (P1) ✅

**Goal**: Users can see their personal rank with detailed stats and surrounding users

**Independent Test**: Đăng nhập và xác nhận card cá nhân hiển thị đầy đủ thông tin + khoảng cách rank

- [x] T017 [US2] Extend user-rank API with comprehensive stats in `pages/api/leaderboard/user-rank.js`
- [x] T018 [P] [US2] Create PersonalStatsCard component in `components/leaderboard/PersonalStatsCard.js`
- [x] T019 [US2] Extend alltime API to return surrounding users in `pages/api/leaderboard/alltime.js`
- [x] T020 [US2] Add personal stats card styles in `styles/leaderboard.module.css`
- [x] T021 [US2] Integrate PersonalStatsCard into leaderboard page in `pages/leaderboard/index.js`

---

## Phase 5: User Story 3 - Biểu đồ tiến bộ (P2) ✅

**Goal**: Users can view their rank progress chart over time

**Independent Test**: Xem biểu đồ rank với ít nhất 7 ngày dữ liệu và xác nhận trend indicator

- [x] T022 [US3] Create rank-history API endpoint in `pages/api/leaderboard/rank-history.js`
- [x] T023 [P] [US3] Create ProgressChart component in `components/leaderboard/ProgressChart.js`
- [x] T024 [US3] Create daily rank snapshot cron job in `scripts/daily-rank-snapshot.js`
- [x] T025 [US3] Add progress chart styles in `styles/leaderboard.module.css`
- [x] T026 [US3] Integrate ProgressChart into leaderboard page in `pages/leaderboard/index.js`

---

## Phase 6: User Story 4 - Badges (P2) ✅

**Goal**: Users can earn and display badges for achievements

**Independent Test**: Người dùng top 10 nhận badge và badge hiển thị với tooltip

- [x] T027 [US4] Create badges API endpoint in `pages/api/leaderboard/badges.js`
- [x] T028 [P] [US4] Create BadgeDisplay component with tooltip in `components/leaderboard/BadgeDisplay.js`
- [x] T029 [US4] Create monthly badge award script in `scripts/award-monthly-badges.js`
- [x] T030 [US4] Add badge display styles in `styles/leaderboard.module.css`
- [x] T031 [US4] Integrate badges into UserRankCard and PersonalStatsCard components

---

## Phase 7: User Story 5 - Time Filters (P2) ✅

**Goal**: Users can filter leaderboard by time period (week, month, all-time)

**Independent Test**: Chuyển đổi tabs thời gian và xác nhận data thay đổi

- [x] T032 [US5] Create weekly API endpoint in `pages/api/leaderboard/weekly.js`
- [x] T033 [P] [US5] Create LeaderboardTabs component (time period tabs) in `components/leaderboard/LeaderboardTabs.js`
- [x] T034 [US5] Create weekly reset cron job in `scripts/weekly-leaderboard-reset.js`
- [x] T035 [US5] Add time tabs styles in `styles/leaderboard.module.css`
- [x] T036 [US5] Integrate LeaderboardTabs into page, connect to weekly/monthly/alltime APIs in `pages/leaderboard/index.js`

---

## Phase 8: User Story 6 - Leagues (P3) ✅

**Goal**: Users are divided into leagues and can compete with similar-level users

**Independent Test**: Xác nhận user được phân vào league đúng và promotion/demotion zone hiển thị

- [x] T037 [US6] Create leagues API endpoint in `pages/api/leaderboard/leagues.js`
- [x] T038 [P] [US6] Create LeagueSelector component in `components/leaderboard/LeagueSelector.js`
- [x] T039 [US6] Create weekly promotion/demotion script in `scripts/weekly-league-update.js`
- [x] T040 [US6] Add league selector and badge colors styles in `styles/leaderboard.module.css`
- [x] T041 [US6] Integrate LeagueSelector into page, show promotion/demotion zones in `pages/leaderboard/index.js`
- [x] T042 [US6] Update User.currentLeague on points change (hook or middleware) in `lib/utils/updateUserLeague.js`

---

## Phase 9: Polish & Cross-Cutting ✅

**Goal**: Edge cases, performance optimization, final integration

- [x] T043 Handle edge case: new user without data (empty state) in `pages/leaderboard/index.js`
- [x] T044 Handle edge case: non-logged-in user (limit to top 20) in all leaderboard APIs
- [x] T045 Handle edge case: server error with retry button in `pages/leaderboard/index.js`
- [x] T046 Add skeleton loading states for all new components in `components/leaderboard/`
- [x] T047 Performance: verify MongoDB indexes are applied and queries are optimized
- [x] T048 Final integration test: all tabs, criteria, leagues working together

---

## Dependencies

```
Phase 1 (Setup)
    │
    v
Phase 2 (Foundational) ──────────────────────────────────────┐
    │                                                         │
    ├──────────────┬──────────────┬──────────────┐           │
    v              v              v              v           │
Phase 3 (US1)  Phase 4 (US2)  Phase 5 (US3)  Phase 6 (US4)  │
[P1-Core]      [P1-Personal]  [P2-Chart]     [P2-Badges]    │
    │              │              │              │           │
    └──────────────┴──────────────┴──────────────┘           │
                        │                                     │
                        v                                     │
                   Phase 7 (US5) ─────────────────────────────┤
                   [P2-Weekly]                                │
                        │                                     │
                        v                                     │
                   Phase 8 (US6) <────────────────────────────┘
                   [P3-Leagues]
                        │
                        v
                   Phase 9 (Polish)
```

**Note**: US1-US4 can be developed in parallel after Phase 2. US5 depends on US1 (shares tab UI). US6 can start after Phase 2.

---

## Parallel Execution Opportunities

### Within Phase 2 (Foundational)
```
T004 (User model) → T005 (indexes)
    ↓ parallel
T006 (WeeklyLeaderboard) | T007 (RankHistory) | T008 (UserBadge) | T009 (UserLeague)
```

### Within Phase 3 (US1)
```
T011 (API) ──────────────────────────┐
    ↓ parallel                        │
T012 (CriteriaTabs) | T013 (RankCard) │
    ↓                                 │
T014 (styles) ← depends on components │
    ↓                                 │
T015, T016 (integration) ←────────────┘
```

### Cross-Story Parallelism
```
After Phase 2:
  US1 (T011-T016) | US2 (T017-T021) | US3 (T022-T026) | US4 (T027-T031)
  All can run in parallel!
```

---

## MVP Scope

**Recommended MVP**: Phase 1 + Phase 2 + Phase 3 (US1) + Phase 4 (US2)

This delivers:
- Multi-criteria ranking (core feature)
- Personal stats with surrounding users
- ~17 tasks, ~6-8 hours

**Extended MVP** (add if time permits):
- Phase 7 (US5): Weekly time filter
- Phase 6 (US4): Badges

---

## Implementation Strategy

1. **Start with data layer** (Phase 2) - all user stories depend on this
2. **Parallel frontend/backend** - API and component can be developed together
3. **Incremental delivery** - Each user story is independently testable
4. **Polish last** - Edge cases and optimization after core features work

---

## File Summary

| Category | Files to Create | Files to Modify |
|----------|-----------------|-----------------|
| Models | 4 | 1 |
| APIs | 5 | 2 |
| Components | 7 | 0 |
| Styles | 0 | 1 |
| Scripts | 5 | 0 |
| Pages | 0 | 1 |
| Constants | 1 | 0 |
| **Total** | **22** | **5** |
