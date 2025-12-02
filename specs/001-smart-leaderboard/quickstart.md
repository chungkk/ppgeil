# Quickstart: Smart Leaderboard Implementation

**Date**: 2024-12-02  
**Feature**: 001-smart-leaderboard

## Prerequisites

- Node.js 18+
- MongoDB running (check `.env.local` for `MONGODB_URI`)
- Project dependencies installed (`npm install`)

## Implementation Order

### Phase 1: Data Layer (Backend)

1. **Extend User model** (`models/User.js`)
   - Add: `streak`, `totalTimeSpent`, `lessonsCompleted`, `weeklyPoints`, `currentLeague`
   - Add indexes

2. **Create new models** (`lib/models/`)
   - `WeeklyLeaderboard.js`
   - `RankHistory.js`
   - `UserBadge.js`
   - `UserLeague.js`

3. **Create constants** (`lib/constants/leagues.js`)
   - League thresholds
   - Promotion/demotion counts

### Phase 2: API Endpoints

1. **New endpoints** (`pages/api/leaderboard/`)
   - `weekly.js` - Weekly leaderboard
   - `by-criteria.js` - Multi-criteria ranking
   - `leagues.js` - League-filtered view
   - `rank-history.js` - Progress chart data
   - `badges.js` - User badges

2. **Extend existing** 
   - `alltime.js` - Add badges, league info
   - `monthly.js` - Add badges, league info
   - `user-rank.js` - Add comprehensive stats

### Phase 3: Scheduled Jobs

1. **Weekly reset** - Monday 00:00 UTC+7
   - Archive WeeklyLeaderboard
   - Reset weeklyPoints
   - Calculate promotion/demotion

2. **Daily snapshot** - 00:00 UTC+7
   - Save RankHistory for each user
   - Cleanup old entries (>30 days via TTL)

3. **Monthly badges** - 1st of month 00:00 UTC+7
   - Award top_monthly badges

### Phase 4: Frontend Components

1. **New components** (`components/leaderboard/`)
   - `LeaderboardTabs.js` - Time period tabs
   - `RankingCriteriaTabs.js` - Criteria selector
   - `PersonalStatsCard.js` - User's stats card
   - `ProgressChart.js` - Rank history chart
   - `BadgeDisplay.js` - Badge icons + tooltips
   - `LeagueSelector.js` - League filter
   - `UserRankCard.js` - Individual rank card

2. **Update page** (`pages/leaderboard/index.js`)
   - Integrate new components
   - Add state management for tabs

3. **Update styles** (`styles/leaderboard.module.css`)
   - New component styles
   - League colors
   - Badge styles

## Quick Test Commands

```bash
# Start dev server
npm run dev

# Test API endpoints
curl http://localhost:3000/api/leaderboard/alltime
curl http://localhost:3000/api/leaderboard/weekly
curl http://localhost:3000/api/leaderboard/by-criteria?criteria=streak

# With auth
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/leaderboard/user-rank
```

## Key Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| `models/User.js` | Extend | P1 |
| `lib/models/WeeklyLeaderboard.js` | Create | P1 |
| `lib/models/RankHistory.js` | Create | P2 |
| `lib/models/UserBadge.js` | Create | P2 |
| `lib/models/UserLeague.js` | Create | P3 |
| `lib/constants/leagues.js` | Create | P1 |
| `pages/api/leaderboard/weekly.js` | Create | P1 |
| `pages/api/leaderboard/by-criteria.js` | Create | P1 |
| `pages/api/leaderboard/leagues.js` | Create | P3 |
| `pages/api/leaderboard/rank-history.js` | Create | P2 |
| `pages/api/leaderboard/badges.js` | Create | P2 |
| `pages/api/leaderboard/alltime.js` | Extend | P1 |
| `pages/leaderboard/index.js` | Redesign | P1 |
| `components/leaderboard/*` | Create | P1-P2 |
| `styles/leaderboard.module.css` | Extend | P1 |

## Environment Variables

No new environment variables needed. Uses existing:
- `MONGODB_URI` - MongoDB connection
- `JWT_SECRET` - Auth token verification

## Database Migrations

No migrations needed - MongoDB schema-less. New fields will be added on first write with defaults.

Run script to initialize existing users:
```bash
node scripts/init-leaderboard-fields.js
```

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Data Layer | 2-3 hours | None |
| Phase 2: API | 3-4 hours | Phase 1 |
| Phase 3: Cron Jobs | 1-2 hours | Phase 1, 2 |
| Phase 4: Frontend | 4-6 hours | Phase 2 |
| Testing & Polish | 2-3 hours | All |
| **Total** | **12-18 hours** | |
