# API Contracts: Smart Leaderboard

**Date**: 2024-12-02  
**Base URL**: `/api/leaderboard`

## Endpoints Overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/alltime` | All-time leaderboard (extend) | Optional |
| GET | `/monthly` | Monthly leaderboard (extend) | Optional |
| GET | `/weekly` | Weekly leaderboard (NEW) | Optional |
| GET | `/by-criteria` | Leaderboard by ranking criteria (NEW) | Optional |
| GET | `/leagues` | League-filtered leaderboard (NEW) | Optional |
| GET | `/user-rank` | Current user's rank details (extend) | Required |
| GET | `/rank-history` | User's rank history for chart (NEW) | Required |
| GET | `/badges` | User's badges (NEW) | Required |

---

## GET /api/leaderboard/alltime

**Description**: Get all-time leaderboard sorted by total points

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page (max 100) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "id": "user_id",
        "name": "User Name",
        "totalPoints": 15000,
        "currentStreak": 30,
        "maxStreak": 45,
        "badges": ["top_alltime", "top_monthly"],
        "league": "gold",
        "isCurrentUser": false
      }
    ],
    "currentUserRank": {
      "rank": 42,
      "totalPoints": 5000,
      "pointsToNextRank": 150,
      "userAbove": { "name": "User Above", "points": 5150 },
      "userBelow": { "name": "User Below", "points": 4900 }
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalEntries": 500,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## GET /api/leaderboard/weekly

**Description**: Get weekly leaderboard (resets every Monday 00:00 UTC+7)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "id": "user_id",
        "name": "User Name",
        "weeklyPoints": 500,
        "timeSpentThisWeek": 3600,
        "lessonsThisWeek": 10,
        "badges": [],
        "league": "silver",
        "isCurrentUser": false
      }
    ],
    "currentUserRank": { ... },
    "countdown": {
      "days": 3,
      "hours": 14,
      "minutes": 30,
      "resetAt": "2024-12-09T00:00:00+07:00"
    },
    "pagination": { ... }
  }
}
```

---

## GET /api/leaderboard/by-criteria

**Description**: Get leaderboard sorted by specific criteria

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| criteria | string | "points" | One of: points, streak, time, lessons, improved |
| period | string | "alltime" | One of: week, month, alltime |
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "criteria": "streak",
    "period": "alltime",
    "leaderboard": [
      {
        "rank": 1,
        "id": "user_id",
        "name": "User Name",
        "value": 120,
        "valueLabel": "120 days",
        "badges": ["top_monthly"],
        "league": "platinum",
        "isCurrentUser": false
      }
    ],
    "currentUserRank": {
      "rank": 15,
      "value": 45,
      "valueLabel": "45 days"
    },
    "pagination": { ... }
  }
}
```

**Criteria value meanings**:
- `points`: Total points
- `streak`: Current streak days
- `time`: Total time spent (seconds)
- `lessons`: Total lessons completed
- `improved`: Points gained this week

---

## GET /api/leaderboard/leagues

**Description**: Get leaderboard filtered by league

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| league | string | (user's league) | One of: bronze, silver, gold, platinum, diamond |
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "league": {
      "name": "Gold",
      "color": "#FFD700",
      "minPoints": 5000,
      "maxPoints": 14999,
      "totalUsers": 150
    },
    "leaderboard": [
      {
        "rank": 1,
        "rankInLeague": 1,
        "id": "user_id",
        "name": "User Name",
        "points": 14500,
        "badges": [],
        "isCurrentUser": false,
        "willPromote": true,
        "willDemote": false
      }
    ],
    "currentUserRank": {
      "rank": 23,
      "rankInLeague": 23,
      "willPromote": false,
      "willDemote": false
    },
    "promotionZone": [1, 2, 3, 4, 5],
    "demotionZone": [146, 147, 148, 149, 150],
    "pagination": { ... }
  }
}
```

---

## GET /api/leaderboard/user-rank

**Description**: Get detailed rank info for current user

**Auth**: Required (Bearer token)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| criteria | string | "points" | Ranking criteria |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "User Name",
      "points": 5000,
      "streak": 30,
      "timeSpent": 36000,
      "lessonsCompleted": 50,
      "weeklyPoints": 200
    },
    "ranks": {
      "points": { "rank": 42, "total": 500 },
      "streak": { "rank": 15, "total": 500 },
      "time": { "rank": 30, "total": 500 },
      "lessons": { "rank": 25, "total": 500 },
      "improved": { "rank": 8, "total": 500 }
    },
    "league": {
      "current": "gold",
      "rankInLeague": 23,
      "willPromote": false,
      "willDemote": false
    },
    "badges": [
      {
        "type": "top_monthly",
        "year": 2024,
        "month": 11,
        "rank": 5,
        "awardedAt": "2024-12-01T00:00:00Z"
      }
    ],
    "surrounding": {
      "above": [
        { "rank": 37, "name": "User37", "points": 5500 },
        { "rank": 38, "name": "User38", "points": 5400 }
      ],
      "below": [
        { "rank": 43, "name": "User43", "points": 4900 },
        { "rank": 44, "name": "User44", "points": 4800 }
      ]
    }
  }
}
```

---

## GET /api/leaderboard/rank-history

**Description**: Get user's rank history for progress chart (last 30 days)

**Auth**: Required (Bearer token)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| days | number | 7 | Number of days (max 30) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "date": "2024-12-01",
        "pointsRank": 45,
        "streakRank": 20,
        "timeRank": 35,
        "points": 4800,
        "streak": 28,
        "timeSpent": 34000
      },
      {
        "date": "2024-12-02",
        "pointsRank": 42,
        "streakRank": 18,
        "timeRank": 32,
        "points": 5000,
        "streak": 29,
        "timeSpent": 36000
      }
    ],
    "trend": {
      "points": { "change": -3, "direction": "up" },
      "streak": { "change": -2, "direction": "up" },
      "time": { "change": -3, "direction": "up" }
    }
  }
}
```

---

## GET /api/leaderboard/badges

**Description**: Get user's earned badges

**Auth**: Required (Bearer token)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "type": "top_monthly",
        "name": "Top Monthly",
        "description": "Achieved Top 10 in monthly leaderboard",
        "icon": "🏆",
        "year": 2024,
        "month": 11,
        "rank": 5,
        "awardedAt": "2024-12-01T00:00:00Z"
      },
      {
        "type": "top_alltime",
        "name": "Top All-Time",
        "description": "Currently in Top 10 all-time",
        "icon": "👑",
        "rank": 8,
        "awardedAt": "2024-11-15T00:00:00Z"
      }
    ],
    "available": [
      {
        "type": "top_monthly",
        "name": "Top Monthly",
        "description": "Reach Top 10 in monthly leaderboard",
        "requirement": "Be in top 10 when month ends"
      },
      {
        "type": "top_alltime",
        "name": "Top All-Time",
        "description": "Reach Top 10 all-time",
        "requirement": "Have enough points to be in top 10"
      }
    ]
  }
}
```

---

## Error Responses

**401 Unauthorized** (for protected endpoints):
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**400 Bad Request**:
```json
{
  "success": false,
  "message": "Invalid criteria. Must be one of: points, streak, time, lessons, improved"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "message": "Lỗi khi tải bảng xếp hạng",
  "error": "Error details (dev only)"
}
```
