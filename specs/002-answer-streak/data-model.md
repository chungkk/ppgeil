# Data Model: Profile Enhancement

**Date**: 2024-12-02

## No New Entities Required

This feature uses existing User model fields. No database changes needed.

## Existing User Fields to Display

### From `/models/User.js`

```javascript
// Identity
name: String
email: String  
createdAt: Date

// Learning Settings
nativeLanguage: String // 'vi' | 'en'
level: String // 'beginner' | 'experienced' | 'all'
preferredDifficultyLevel: String // 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'c1c2'

// Points
points: Number // Total points
monthlyPoints: Number
weeklyPoints: Number

// Streaks
streak: {
  currentStreak: Number,
  maxStreak: Number,
  lastActiveDate: Date
}
answerStreak: {
  current: Number,
  max: Number,
  lastAnswerTime: Date
}

// Progress
totalTimeSpent: Number // in minutes
lessonsCompleted: Number
currentLeague: String // 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
```

## Component Props Interface

```typescript
interface UserProfileSidebarProps {
  stats: {
    totalLessons: number;
    completedLessons: number;
    inProgressLessons: number;
  };
  userPoints: number;
}

// User object from useAuth() context
interface User {
  name: string;
  email: string;
  createdAt: string;
  nativeLanguage: 'vi' | 'en';
  level: string;
  preferredDifficultyLevel: string;
  points: number;
  monthlyPoints: number;
  weeklyPoints: number;
  streak: {
    currentStreak: number;
    maxStreak: number;
  };
  answerStreak: {
    current: number;
    max: number;
  };
  totalTimeSpent: number;
  lessonsCompleted: number;
  currentLeague: string;
}
```

## Display Formatting

| Field | Display Format | Example |
|-------|---------------|---------|
| createdAt | Relative date | "Tham gia 3 tháng trước" |
| totalTimeSpent | Hours + Minutes | "12h 30m" |
| currentLeague | Emoji + Name | "🥇 Gold" |
| preferredDifficultyLevel | Uppercase | "B1" |
| streak.currentStreak | Number + fire icon | "🔥 15" |
| answerStreak.current | Number + lightning | "⚡ 8" |
