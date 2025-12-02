# Research: Smart Leaderboard Design

**Date**: 2024-12-02  
**Feature**: 001-smart-leaderboard

## 1. Multiple Ranking Criteria Implementation

**Decision**: Sử dụng MongoDB aggregation pipeline với dynamic sort field

**Rationale**: 
- Existing codebase đã dùng Mongoose với MongoDB
- Aggregation pipeline cho phép sort dynamic mà không cần tạo nhiều indexes
- Có thể reuse query logic với parameter khác nhau

**Alternatives considered**:
- Separate collections per criteria: Rejected - quá nhiều data duplication
- Client-side sorting: Rejected - không scale với 10k+ users
- Materialized views: Rejected - MongoDB không native support, phức tạp maintain

**Implementation approach**:
```javascript
const sortFields = {
  points: { points: -1 },
  streak: { 'streak.currentStreak': -1 },
  time: { totalTimeSpent: -1 },
  lessons: { lessonsCompleted: -1 },
  improved: { weeklyPointsGained: -1 }
};
```

## 2. Weekly Leaderboard Reset

**Decision**: Scheduled job với node-cron (đã có trong dependencies)

**Rationale**:
- node-cron đã được cài trong project
- Có thể chạy trong Next.js API route với custom server hoặc external cron
- Simple và reliable cho use case này

**Reset logic**:
- Reset vào 00:00 UTC+7 mỗi thứ Hai
- Archive tuần cũ vào `WeeklyLeaderboard` collection trước khi reset
- Calculate `weeklyPointsGained = currentPoints - lastWeekPoints`

## 3. League System

**Decision**: Point-based leagues với weekly promotion/demotion

**Rationale**:
- Simple implementation - chỉ cần check total points
- Không cần separate matching system
- Users tự động vào league dựa trên points

**League thresholds** (từ spec):
| League | Min Points | Max Points |
|--------|------------|------------|
| Bronze | 0 | 999 |
| Silver | 1,000 | 4,999 |
| Gold | 5,000 | 14,999 |
| Platinum | 15,000 | 49,999 |
| Diamond | 50,000+ | ∞ |

**Promotion/Demotion**:
- Weekly cron job
- Top 5 mỗi league → promote
- Bottom 5 mỗi league (trừ Bronze) → demote
- Store league history trong UserLeague model

## 4. Badge System

**Decision**: Event-driven badge award với 2 badge types

**Rationale**:
- Minimal scope (chỉ 2 badges theo clarification)
- Check conditions khi month/alltime leaderboard updates
- Store badges trong UserBadge collection

**Badge types**:
1. `top_monthly` - Top 10 cuối tháng
2. `top_alltime` - Top 10 all-time (check mỗi khi leaderboard update)

## 5. Progress Chart Data

**Decision**: Store daily rank snapshots trong RankHistory

**Rationale**:
- Lightweight - chỉ cần store rank + date
- 30-day retention (theo clarification)
- Có thể generate chart data với simple query

**Data structure**:
```javascript
{
  userId: ObjectId,
  date: Date,
  rank: Number,
  points: Number,
  criteria: String // 'points', 'streak', etc.
}
```

## 6. Performance Optimization

**Decision**: MongoDB indexes + client-side caching với SWR

**Indexes needed**:
```javascript
// User model
{ points: -1, createdAt: 1 }
{ 'streak.currentStreak': -1 }
{ totalTimeSpent: -1 }

// WeeklyLeaderboard
{ year: 1, week: 1, weeklyPoints: -1 }

// RankHistory
{ userId: 1, date: -1 }
{ date: 1 } // TTL index for 30-day cleanup
```

**SWR config**:
- `revalidateOnFocus: false`
- `dedupingInterval: 60000` (1 minute)
- `refreshInterval: 300000` (5 minutes)

## 7. Tie-breaking

**Decision**: Earlier achievement wins (existing pattern)

**Implementation**: 
- Sort by primary field DESC, then `createdAt` ASC
- Consistent với existing `alltime.js` implementation

## 8. Responsive UI Approach

**Decision**: Extend existing mobile-first CSS

**Rationale**:
- Existing `leaderboard.module.css` đã có responsive breakpoints
- Podium style for desktop, card list for mobile (existing)
- Add new components following same pattern
