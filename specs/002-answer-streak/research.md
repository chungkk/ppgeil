# Research: Profile Page Enhancement

**Date**: 2024-12-02  
**Feature**: Display more user information on profile page

## Current State Analysis

### User Model Fields Available (from `/models/User.js`)

| Field | Type | Currently Displayed | Should Display |
|-------|------|---------------------|----------------|
| name | String | ✅ Yes (sidebar) | Yes |
| email | String | ❌ No | Yes |
| role | String | ❌ No | Optional |
| nativeLanguage | String | ❌ No | Yes |
| level | String | ❌ No | Yes |
| preferredDifficultyLevel | String | ❌ No | Yes |
| points | Number | ✅ Yes (sidebar) | Yes |
| monthlyPoints | Number | ❌ No | Yes |
| weeklyPoints | Number | ❌ No | Yes |
| streak.currentStreak | Number | ❌ No | Yes (P1) |
| streak.maxStreak | Number | ❌ No | Yes (P1) |
| answerStreak.current | Number | ❌ No | Yes (P1) |
| answerStreak.max | Number | ❌ No | Yes (P1) |
| totalTimeSpent | Number | ❌ No | Yes |
| lessonsCompleted | Number | ❌ No | Yes |
| currentLeague | String | ❌ No | Yes |
| createdAt | Date | ❌ No | Yes (Member since) |
| lastLoginDate | Date | ❌ No | Optional |

### Current Profile Sidebar Components

1. **User Identity Section**: Avatar (first letter), Name, Privacy toggle
2. **User Stats Section**: Points (€), Total Lessons

### Missing Information Categories

1. **Streak Information**
   - Daily login streak (current/max)
   - Answer streak (current/max)
   
2. **Learning Progress**
   - Total time spent learning
   - Lessons completed count
   - German level (A1-C2)
   
3. **Ranking Information**
   - Current league (bronze/silver/gold/platinum/diamond)
   - Weekly/Monthly points

4. **Account Information**
   - Email address
   - Member since date
   - Native language preference

## Decision: UI Layout for Enhanced Profile

### Rationale
The sidebar should be organized into clear sections for better UX:
1. **Identity Section** - Avatar, name, email, member since
2. **League & Rank Section** - Current league with badge visual
3. **Streaks Section** - Daily streak and Answer streak
4. **Stats Grid** - Points, time spent, lessons, level

### Alternatives Considered
1. **Single long list** - Rejected: Too cluttered, no visual hierarchy
2. **Separate tabs** - Rejected: Over-engineering for current amount of data
3. **Cards grid** - Chosen: Clean, scannable, follows existing design patterns

## Technical Decisions

### Data Fetching
- **Decision**: Use existing `useAuth` context which provides `user` object
- **Rationale**: User data is already loaded in AuthContext, no additional API calls needed

### Formatting
- **Time Spent**: Convert minutes to hours/minutes display
- **Member Since**: Format as relative date (e.g., "3 months ago")
- **League**: Display with emoji badge (🥉🥈🥇💎💠)

### Styling
- **Decision**: Extend existing `UserProfileSidebar.module.css`
- **Rationale**: Maintain consistency with current design system
