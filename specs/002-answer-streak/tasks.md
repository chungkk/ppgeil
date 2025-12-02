# Tasks: Profile Page Enhancement

**Branch**: `002-profile-enhancement` | **Generated**: 2024-12-02  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

Enhance UserProfileSidebar to display more user information from existing User model.

**Files to Modify**:
- `components/UserProfileSidebar.js`
- `styles/UserProfileSidebar.module.css`

---

## Phase 1: Setup & Foundational

- [x] T001 Add helper formatting functions in `components/UserProfileSidebar.js`
  - `formatTimeSpent(minutes)` - Convert minutes to "Xh Ym" format
  - `formatMemberSince(dateString)` - Convert date to relative format
  - `getLeagueEmoji(league)` - Return emoji for league tier
  - `getLeagueLabel(league)` - Return Vietnamese label for league

---

## Phase 2: User Story 1 - League Badge Section (P1)

**Goal**: Display user's current league prominently with visual badge

**Independent Test**: Open profile page and verify league badge shows correct league with emoji

- [x] T002 [P] [US1] Add `.leagueBadge` CSS styles in `styles/UserProfileSidebar.module.css`
  - League container with gradient background per tier
  - Emoji icon styling with animation
  - League name text styling
  - Responsive design for mobile

- [x] T003 [US1] Add League Badge section in `components/UserProfileSidebar.js`
  - Display `user.currentLeague` with emoji (🥉🥈🥇💎👑)
  - Show league name in Vietnamese (Đồng/Bạc/Vàng/Kim cương/Huyền thoại)
  - Position between Identity and Stats sections

---

## Phase 3: User Story 2 - Streaks Display (P1)

**Goal**: Show daily streak and answer streak stats

**Independent Test**: Open profile and verify both streak types display with correct icons

- [x] T004 [P] [US2] Add `.streakSection` CSS styles in `styles/UserProfileSidebar.module.css`
  - Grid layout for 2 streak items side by side
  - Streak item card styling
  - Fire/lightning icons with color
  - Current vs max streak display
  - Responsive stacking on mobile

- [x] T005 [US2] Add Streaks section in `components/UserProfileSidebar.js`
  - Daily Streak: `user.streak.currentStreak` / `user.streak.maxStreak` with 🔥 icon
  - Answer Streak: `user.answerStreak.current` / `user.answerStreak.max` with ⚡ icon
  - Show "current / max" format
  - Handle null/undefined values gracefully

---

## Phase 4: User Story 3 - Stats Grid (P1)

**Goal**: Display learning statistics in organized grid

**Independent Test**: Verify time spent, level, lessons completed show correctly formatted

- [x] T006 [P] [US3] Add `.statsGrid` and `.statItem` CSS styles in `styles/UserProfileSidebar.module.css`
  - 2-column grid layout
  - Individual stat card styling with icon + label + value
  - Hover effects
  - Responsive single column on mobile

- [x] T007 [US3] Add Stats Grid section in `components/UserProfileSidebar.js`
  - Time Spent: `formatTimeSpent(user.totalTimeSpent)` with ⏱️ icon
  - Level: `user.preferredDifficultyLevel.toUpperCase()` with 📊 icon
  - Lessons Done: `user.lessonsCompleted` with ✅ icon
  - Weekly Points: `user.weeklyPoints` with 📈 icon

---

## Phase 5: User Story 4 - Account Info (P2)

**Goal**: Show email and member since date

**Independent Test**: Verify email displays (partially masked) and join date shows correctly

- [x] T008 [P] [US4] Add `.accountInfo` CSS styles in `styles/UserProfileSidebar.module.css`
  - Info row styling with icon + text
  - Email truncation for long emails
  - Subtle styling (secondary text color)

- [x] T009 [US4] Add Account Info section in `components/UserProfileSidebar.js`
  - Email: `user.email` with ✉️ icon (consider privacy - show full or mask middle)
  - Member Since: `formatMemberSince(user.createdAt)` with 📅 icon
  - Position at bottom of sidebar

---

## Phase 6: Polish & Integration

- [x] T010 Verify all sections render correctly with missing data (null/undefined handling)
- [x] T011 Test responsive layout on mobile viewport (576px, 768px)
- [x] T012 Verify dark mode styling works correctly for all new sections

---

## Dependencies

```
T001 (helpers) ─┬──► T003 (league section)
                ├──► T005 (streaks section)
                ├──► T007 (stats grid)
                └──► T009 (account info)

T002 (CSS) ──────► T003 (league section)
T004 (CSS) ──────► T005 (streaks section)
T006 (CSS) ──────► T007 (stats grid)
T008 (CSS) ──────► T009 (account info)
```

## Parallel Execution Opportunities

**Batch 1** (can run simultaneously):
- T002, T004, T006, T008 (all CSS tasks - different sections)

**Batch 2** (after T001, parallel CSS tasks):
- T003, T005, T007, T009 (component sections - order doesn't matter)

**Batch 3** (after all sections):
- T010, T011, T012 (validation tasks)

---

## Implementation Strategy

### MVP (Minimum Viable Product)
- Phase 1 + Phase 2 (helper functions + league badge)
- Provides immediate visual enhancement with minimal risk

### Incremental Delivery
1. **Increment 1**: League Badge (visual impact, simple)
2. **Increment 2**: Streaks Section (gamification visibility)
3. **Increment 3**: Stats Grid (comprehensive data)
4. **Increment 4**: Account Info (completeness)

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 12 |
| Phase 1 (Setup) | 1 task |
| Phase 2-5 (User Stories) | 8 tasks (2 per story) |
| Phase 6 (Polish) | 3 tasks |
| Parallelizable Tasks | 4 CSS tasks + 4 component tasks |
| Files Modified | 2 |
| New Files | 0 |
| API Changes | None |
