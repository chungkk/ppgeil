# Implementation Plan: Smart Leaderboard Design

**Branch**: `001-smart-leaderboard` | **Date**: 2024-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-smart-leaderboard/spec.md`

## Summary

Thiết kế lại trang Leaderboard với đa tiêu chí ranking (Points, Streak, Time, Most Improved), hệ thống League (Bronze-Diamond), badges (Top Monthly/All-time), và biểu đồ tiến bộ. Sử dụng Next.js API routes với MongoDB aggregation pipelines để tối ưu hiệu năng.

## Technical Context

**Language/Version**: JavaScript/Node.js (Next.js 14, React 18)  
**Primary Dependencies**: React, SWR, Mongoose, MongoDB  
**Storage**: MongoDB (existing MonthlyLeaderboard, User models)  
**Testing**: Manual testing (no test framework configured)  
**Target Platform**: Web (responsive: mobile-first)  
**Project Type**: Web application (Next.js full-stack)  
**Performance Goals**: <1s tab switch, <2s page load on 3G, 10k concurrent users  
**Constraints**: UTC+7 timezone for resets, 30-day RankHistory retention  
**Scale/Scope**: ~10,000 users, 5 ranking criteria, 5 leagues

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution chưa được cấu hình cụ thể cho project này (template mặc định). Tiếp tục với best practices:

- [x] **Code Quality**: Sử dụng existing patterns trong codebase
- [x] **Testing**: Sẽ test manual trước, có thể thêm unit tests sau
- [x] **Security**: Sử dụng existing auth (JWT + next-auth)
- [x] **Performance**: MongoDB indexes cho sorting, pagination

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-leaderboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API specs)
│   └── leaderboard-api.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Next.js Web Application Structure (existing)
pages/
├── api/
│   └── leaderboard/
│       ├── alltime.js          # Existing - will extend
│       ├── monthly.js          # Existing - will extend
│       ├── weekly.js           # NEW
│       ├── by-criteria.js      # NEW (streak, time, improved)
│       ├── leagues.js          # NEW
│       ├── user-rank.js        # Existing - will extend
│       ├── rank-history.js     # NEW
│       └── badges.js           # NEW
└── leaderboard/
    └── index.js                # Existing - will redesign

lib/
└── models/
    ├── MonthlyLeaderboard.js   # Existing - may extend
    ├── WeeklyLeaderboard.js    # NEW
    ├── RankHistory.js          # NEW
    ├── UserBadge.js            # NEW
    └── UserLeague.js           # NEW

models/
└── User.js                     # Existing - will extend (streak, timeSpent)

components/
└── leaderboard/                # NEW
    ├── LeaderboardTabs.js
    ├── RankingCriteriaTabs.js
    ├── PersonalStatsCard.js
    ├── ProgressChart.js
    ├── BadgeDisplay.js
    ├── LeagueSelector.js
    └── UserRankCard.js

styles/
└── leaderboard.module.css      # Existing - will extend
```

**Structure Decision**: Extend existing Next.js structure. New API routes follow existing pattern. New React components in dedicated `/components/leaderboard/` folder.

## Complexity Tracking

> No constitution violations detected. Following existing codebase patterns.
