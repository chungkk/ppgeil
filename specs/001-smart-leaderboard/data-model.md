# Data Model: Smart Leaderboard

**Date**: 2024-12-02  
**Feature**: 001-smart-leaderboard

## Entity Relationship Diagram

```
┌──────────────────┐     ┌──────────────────────┐
│      User        │────<│  MonthlyLeaderboard  │
│  (existing)      │     │     (existing)       │
└────────┬─────────┘     └──────────────────────┘
         │
         │ 1:N
         ├─────────────<┌──────────────────────┐
         │              │  WeeklyLeaderboard   │
         │              │       (NEW)          │
         │              └──────────────────────┘
         │
         │ 1:N
         ├─────────────<┌──────────────────────┐
         │              │    RankHistory       │
         │              │       (NEW)          │
         │              └──────────────────────┘
         │
         │ 1:N
         ├─────────────<┌──────────────────────┐
         │              │     UserBadge        │
         │              │       (NEW)          │
         │              └──────────────────────┘
         │
         │ 1:N
         └─────────────<┌──────────────────────┐
                        │     UserLeague       │
                        │       (NEW)          │
                        └──────────────────────┘
```

## Existing Models (to extend)

### User (extend)

**File**: `models/User.js`

**New fields to add**:
```javascript
{
  // Existing fields...
  
  // NEW: Extended streak tracking
  streak: {
    currentStreak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null }
  },
  
  // NEW: Time tracking
  totalTimeSpent: { type: Number, default: 0 }, // seconds
  
  // NEW: Lessons tracking  
  lessonsCompleted: { type: Number, default: 0 },
  
  // NEW: Weekly points tracking
  weeklyPoints: { type: Number, default: 0 },
  lastWeeklyReset: { type: Date, default: null },
  
  // NEW: Current league
  currentLeague: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  }
}
```

**Indexes to add**:
```javascript
{ points: -1, createdAt: 1 }
{ 'streak.currentStreak': -1, createdAt: 1 }
{ totalTimeSpent: -1, createdAt: 1 }
{ lessonsCompleted: -1, createdAt: 1 }
{ weeklyPoints: -1, createdAt: 1 }
{ currentLeague: 1, points: -1 }
```

### MonthlyLeaderboard (existing, no changes needed)

**File**: `lib/models/MonthlyLeaderboard.js`

Already has: `monthlyPoints`, `totalTimeSpent`, `sentencesCompleted`, `lessonsCompleted`, `streakDays`, `maxStreakThisMonth`

## New Models

### WeeklyLeaderboard

**File**: `lib/models/WeeklyLeaderboard.js`

```javascript
const WeeklyLeaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: { type: Number, required: true },
  week: { type: Number, required: true, min: 1, max: 53 },
  
  // Points
  weeklyPoints: { type: Number, default: 0 },
  startingPoints: { type: Number, default: 0 }, // points at week start
  
  // Activity
  timeSpent: { type: Number, default: 0 }, // seconds this week
  lessonsCompleted: { type: Number, default: 0 },
  sentencesCompleted: { type: Number, default: 0 },
  
  // Streak
  maxStreakThisWeek: { type: Number, default: 0 },
  
  // Rank (calculated)
  rank: { type: Number, default: null },
  
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
WeeklyLeaderboardSchema.index({ year: 1, week: 1, weeklyPoints: -1 });
WeeklyLeaderboardSchema.index({ userId: 1, year: 1, week: 1 }, { unique: true });
```

### RankHistory

**File**: `lib/models/RankHistory.js`

```javascript
const RankHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: { type: Date, required: true },
  
  // Ranks by criteria
  pointsRank: { type: Number },
  streakRank: { type: Number },
  timeRank: { type: Number },
  
  // Snapshot values
  points: { type: Number },
  streak: { type: Number },
  timeSpent: { type: Number }
}, { timestamps: true });

// Indexes
RankHistorySchema.index({ userId: 1, date: -1 });
RankHistorySchema.index({ date: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL
```

### UserBadge

**File**: `lib/models/UserBadge.js`

```javascript
const UserBadgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badgeType: {
    type: String,
    enum: ['top_monthly', 'top_alltime'],
    required: true
  },
  
  // For monthly badges
  year: { type: Number },
  month: { type: Number },
  
  // Achievement details
  rank: { type: Number, required: true }, // 1-10
  points: { type: Number },
  
  awardedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
UserBadgeSchema.index({ userId: 1 });
UserBadgeSchema.index({ badgeType: 1, year: 1, month: 1 });
UserBadgeSchema.index({ userId: 1, badgeType: 1, year: 1, month: 1 }, { unique: true });
```

### UserLeague

**File**: `lib/models/UserLeague.js`

```javascript
const UserLeagueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  league: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    required: true
  },
  
  // Timing
  year: { type: Number, required: true },
  week: { type: Number, required: true },
  
  // Position in league
  rankInLeague: { type: Number },
  totalInLeague: { type: Number },
  
  // Movement
  promoted: { type: Boolean, default: false },
  demoted: { type: Boolean, default: false },
  previousLeague: { type: String },
  
  // Points snapshot
  points: { type: Number }
}, { timestamps: true });

// Indexes
UserLeagueSchema.index({ userId: 1, year: 1, week: 1 }, { unique: true });
UserLeagueSchema.index({ year: 1, week: 1, league: 1, rankInLeague: 1 });
```

## League Thresholds (Constants)

```javascript
// lib/constants/leagues.js
export const LEAGUES = {
  bronze: { min: 0, max: 999, color: '#CD7F32', name: 'Bronze' },
  silver: { min: 1000, max: 4999, color: '#C0C0C0', name: 'Silver' },
  gold: { min: 5000, max: 14999, color: '#FFD700', name: 'Gold' },
  platinum: { min: 15000, max: 49999, color: '#E5E4E2', name: 'Platinum' },
  diamond: { min: 50000, max: Infinity, color: '#B9F2FF', name: 'Diamond' }
};

export const PROMOTION_COUNT = 5;
export const DEMOTION_COUNT = 5;
```

## Validation Rules

| Field | Rule |
|-------|------|
| `weeklyPoints` | >= 0 |
| `rank` | >= 1 |
| `badge.rank` | 1-10 |
| `league` | One of: bronze, silver, gold, platinum, diamond |
| `week` | 1-53 |
| `month` | 1-12 |

## State Transitions

### League Transitions
```
           promote (top 5)
Bronze ─────────────────────> Silver
       <─────────────────────
           demote (bottom 5)

Similar for Silver↔Gold, Gold↔Platinum, Platinum↔Diamond
Exception: Bronze bottom 5 stays in Bronze
```

### Badge Award Conditions
```
top_monthly: User in top 10 at month end
  Trigger: Monthly cron job at 00:00 UTC+7 on 1st
  
top_alltime: User currently in top 10 all-time
  Trigger: Real-time check on leaderboard access
```
