# Phase 1: Data Model

**Feature**: Native Mobile App for German Language Learning  
**Date**: 2024-12-16  
**Status**: Phase 1 Complete

## Overview

This document defines the data entities and their relationships for the mobile app. These models align with the existing backend API and define the client-side TypeScript types.

---

## Core Entities

### 1. Lesson

Represents a learning unit with audio/video content and transcript.

**TypeScript Type**:
```typescript
interface Lesson {
  id: string;                    // Unique identifier
  title: string;                 // Lesson title (e.g., "Daily Conversation: At the Bakery")
  description: string;           // Brief description
  difficulty: DifficultyLevel;   // beginner | intermediate | advanced
  category: Category;            // Reference to Category entity
  categorySlug: string;          // Category slug for filtering
  
  // Media
  audioUrl: string;              // URL to audio file
  videoUrl?: string;             // Optional video URL
  thumbnailUrl: string;          // Thumbnail image
  duration: number;              // Duration in seconds
  
  // Transcript
  transcript: TranscriptSegment[]; // Array of transcript segments
  
  // Metadata
  viewCount: number;             // Number of views
  createdAt: Date;               // Creation date
  updatedAt: Date;               // Last update date
  
  // User-specific (optional, only when user logged in)
  userProgress?: UserLessonProgress;
  isDownloaded?: boolean;        // Whether lesson is downloaded for offline
}

enum DifficultyLevel {
  Beginner = 'beginner',
  Intermediate = 'intermediate', 
  Advanced = 'advanced',
}

interface TranscriptSegment {
  id: string;                    // Segment ID
  text: string;                  // German text
  startTime: number;             // Start time in seconds
  endTime: number;               // End time in seconds
  translation?: string;          // Optional translation
}
```

**Validation Rules** (from Requirements):
- `title`: Required, 3-200 characters
- `duration`: Must be > 0
- `audioUrl`: Must be valid URL
- `transcript`: Must have at least 1 segment
- `transcript.startTime`: Must be >= 0 and < endTime
- `transcript.endTime`: Must be > startTime and <= duration

**State Transitions**:
```
Draft → Published → Archived
```

**Relationships**:
- Belongs to one `Category`
- Has many `TranscriptSegment`s
- Has one `UserLessonProgress` (per user)
- Has many `DictationExercise`s

---

### 2. User

Represents a learner account with preferences and progress.

**TypeScript Type**:
```typescript
interface User {
  id: string;                    // Unique identifier
  email: string;                 // Email address (unique)
  name: string;                  // Display name
  role: UserRole;                // user | admin
  
  // Profile
  avatarUrl?: string;            // Profile picture URL
  nativeLanguage: Language;      // Preferred translation language
  level: DifficultyLevel;        // Current learning level
  
  // Gamification
  points: number;                // Total points earned
  streak: number;                // Consecutive days of practice
  lastActivityDate: Date;        // Last time user completed lesson
  
  // Preferences
  preferences: UserPreferences;
  
  // Statistics
  stats: UserStats;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

enum UserRole {
  User = 'user',
  Admin = 'admin',
}

enum Language {
  German = 'de',
  Vietnamese = 'vi',
  English = 'en',
}

interface UserPreferences {
  defaultPlaybackSpeed: number;  // 0.5 - 2.0
  interfaceLanguage: Language;   // UI language
  theme: Theme;                  // light | dark | system
  autoPlayNext: boolean;         // Auto-play next lesson
  downloadQuality: 'low' | 'medium' | 'high'; // Offline download quality
}

enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

interface UserStats {
  totalLessonsCompleted: number;
  totalTimeSpent: number;        // Total minutes
  averageAccuracy: number;       // 0-100%
  longestStreak: number;         // Best streak ever
  lessonsThisWeek: number;
  lessonsThisMonth: number;
}
```

**Validation Rules**:
- `email`: Valid email format, unique
- `name`: 2-50 characters
- `points`: >= 0
- `streak`: >= 0
- `preferences.defaultPlaybackSpeed`: 0.5 <= x <= 2.0
- `stats.averageAccuracy`: 0 <= x <= 100

**Relationships**:
- Has many `UserLessonProgress` records
- Has many `VocabularyItem`s
- Has one `LeaderboardEntry` (per time period)
- Has many `DownloadedLesson`s

---

### 3. Category

Represents a grouping of related lessons.

**TypeScript Type**:
```typescript
interface Category {
  id: string;                    // Unique identifier
  name: string;                  // Category name (e.g., "Daily Conversations")
  slug: string;                  // URL-friendly slug (e.g., "daily-conversations")
  description: string;           // Brief description
  
  // Display
  iconName?: string;             // Icon identifier
  color?: string;                // Hex color code
  order: number;                 // Display order (ascending)
  
  // Metadata
  lessonCount: number;           // Number of lessons in category
  isActive: boolean;             // Whether category is visible
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `name`: Required, 2-100 characters
- `slug`: Required, unique, lowercase, no spaces
- `order`: >= 0
- `lessonCount`: >= 0

**Relationships**:
- Has many `Lesson`s

---

### 4. UserLessonProgress

Tracks a user's interaction with a specific lesson.

**TypeScript Type**:
```typescript
interface UserLessonProgress {
  id: string;                    // Unique identifier
  userId: string;                // Reference to User
  lessonId: string;              // Reference to Lesson
  
  // Progress
  status: ProgressStatus;        // not_started | in_progress | completed
  playbackPosition: number;      // Last playback position (seconds)
  completionPercentage: number;  // 0-100
  
  // Gamification
  pointsEarned: number;          // Points from this lesson
  accuracyScore?: number;        // Dictation accuracy (0-100)
  attemptsCount: number;         // Number of times attempted
  
  // Timestamps
  startedAt?: Date;              // When first started
  completedAt?: Date;            // When completed
  lastAccessedAt: Date;          // Most recent access
}

enum ProgressStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Completed = 'completed',
}
```

**Validation Rules**:
- `userId` and `lessonId`: Must reference existing entities
- Unique constraint on (`userId`, `lessonId`)
- `playbackPosition`: 0 <= x <= lesson.duration
- `completionPercentage`: 0 <= x <= 100
- `accuracyScore`: 0 <= x <= 100 (if present)
- `attemptsCount`: >= 1
- `completedAt`: Must be >= startedAt (if both present)

**State Transitions**:
```
not_started → in_progress → completed
     ↓             ↓
     └─────────────┘
   (can replay completed lessons)
```

**Relationships**:
- Belongs to one `User`
- Belongs to one `Lesson`

---

### 5. VocabularyItem

Represents a word saved by a user for later review.

**TypeScript Type**:
```typescript
interface VocabularyItem {
  id: string;                    // Unique identifier
  userId: string;                // Reference to User
  
  // Word data
  word: string;                  // German word
  translation: string;           // Translation in user's language
  definition: string;            // Definition/explanation
  exampleSentence?: string;      // Example usage
  pronunciationUrl?: string;     // Audio pronunciation URL
  
  // Context
  lessonId?: string;             // Lesson where word was encountered
  context?: string;              // Sentence context from lesson
  
  // Review
  reviewCount: number;           // Times reviewed
  lastReviewedAt?: Date;         // Last review date
  masteryLevel: number;          // 0-5 (spaced repetition)
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `word`: Required, 1-100 characters
- `translation`: Required, 1-500 characters
- `masteryLevel`: 0 <= x <= 5
- `reviewCount`: >= 0
- Unique constraint on (`userId`, `word`)

**Relationships**:
- Belongs to one `User`
- Optionally references one `Lesson`

---

### 6. LeaderboardEntry

Represents a user's ranking position.

**TypeScript Type**:
```typescript
interface LeaderboardEntry {
  id: string;                    // Unique identifier
  userId: string;                // Reference to User
  
  // Ranking
  rank: number;                  // Position (1 = first place)
  points: number;                // Total points
  
  // Period
  period: LeaderboardPeriod;     // weekly | monthly | alltime
  periodStart: Date;             // Period start date
  periodEnd: Date;               // Period end date
  
  // User info (denormalized for performance)
  userName: string;
  userAvatar?: string;
  
  // Timestamps
  updatedAt: Date;               // Last rank update
}

enum LeaderboardPeriod {
  Weekly = 'weekly',
  Monthly = 'monthly',
  AllTime = 'alltime',
}
```

**Validation Rules**:
- `rank`: >= 1
- `points`: >= 0
- `periodEnd`: Must be >= periodStart
- Unique constraint on (`userId`, `period`, `periodStart`)

**Relationships**:
- Belongs to one `User`

---

### 7. DownloadedLesson

Tracks lessons downloaded for offline access.

**TypeScript Type**:
```typescript
interface DownloadedLesson {
  id: string;                    // Unique identifier
  userId: string;                // Reference to User
  lessonId: string;              // Reference to Lesson
  
  // Files
  audioFilePath: string;         // Local file path
  transcriptData: TranscriptSegment[]; // Cached transcript
  thumbnailPath?: string;        // Local thumbnail path
  
  // Metadata
  fileSize: number;              // Total size in bytes
  downloadedAt: Date;            // Download timestamp
  quality: 'low' | 'medium' | 'high'; // Download quality
  
  // Sync
  isStale: boolean;              // Whether lesson has updates online
  lastSyncedAt: Date;            // Last sync check
}
```

**Validation Rules**:
- `userId` and `lessonId`: Must reference existing entities
- Unique constraint on (`userId`, `lessonId`)
- `fileSize`: > 0
- `audioFilePath`: Must be valid local file path

**Relationships**:
- Belongs to one `User`
- Belongs to one `Lesson`

---

## Data Relationships Diagram

```
┌──────────┐       ┌──────────┐       ┌─────────────────────┐
│ Category │◄──────│  Lesson  │───────► UserLessonProgress  │
└──────────┘       └──────────┘       └─────────────────────┘
    1 : N              │                        │
                       │                        │ N : 1
                       │                        │
                       │                   ┌────▼────┐
                       │                   │  User   │
                       │                   └────┬────┘
                       │                        │
                       │  N : 1                 │ 1 : N
                       └────────────────────────┼───────────┐
                                                │           │
                           ┌────────────────────┘           │
                           │                                │
                           │ 1 : N                    1 : N │
                     ┌─────▼────────┐         ┌─────────────▼────┐
                     │ Vocabulary   │         │ LeaderboardEntry │
                     │    Item      │         └──────────────────┘
                     └──────────────┘                 │
                           │                          │ 1 : N
                           │ N : 1                    │
                           └──────────┐          ┌────▼────────────┐
                                      │          │ Downloaded      │
                                      └──────────►    Lesson       │
                                                 └─────────────────┘
```

---

## Local Storage Schema

### AsyncStorage Keys

```typescript
// Preferences
const STORAGE_KEYS = {
  // User preferences
  THEME: '@app/theme',                    // 'light' | 'dark' | 'system'
  LANGUAGE: '@app/language',              // 'de' | 'vi' | 'en'
  PLAYBACK_SPEED: '@app/playbackSpeed',   // number (0.5-2.0)
  
  // Cached data
  LESSONS_CACHE: '@app/lessons',          // Lesson[] (JSON)
  CATEGORIES_CACHE: '@app/categories',    // Category[] (JSON)
  
  // User session
  USER_DATA: '@app/userData',             // User (JSON)
  LAST_SYNC: '@app/lastSync',             // timestamp
};
```

### SecureStore Keys

```typescript
// Sensitive data
const SECURE_KEYS = {
  AUTH_TOKEN: 'auth_token',               // JWT token
  REFRESH_TOKEN: 'refresh_token',         // Refresh token
};
```

### FileSystem Structure

```
/Documents/
├── lessons/                    # Downloaded lessons
│   ├── {lessonId}/
│   │   ├── audio.m4a          # Audio file
│   │   ├── transcript.json    # Transcript data
│   │   └── thumbnail.jpg      # Thumbnail image
│   └── ...
└── cache/                      # Temporary files
    ├── images/                # Cached images
    └── audio/                 # Audio cache
```

---

## API Response Types

These types define the expected structure from backend API responses.

### GET /api/lessons
```typescript
interface LessonsResponse {
  lessons: Lesson[];
  total: number;
  page: number;
  limit: number;
}
```

### GET /api/lessons/[id]
```typescript
interface LessonDetailResponse {
  lesson: Lesson;
  relatedLessons?: Lesson[];
}
```

### GET /api/auth/me
```typescript
interface AuthMeResponse {
  user: User;
}
```

### POST /api/user/points
```typescript
interface UpdatePointsRequest {
  lessonId: string;
  pointsEarned: number;
  accuracyScore?: number;
}

interface UpdatePointsResponse {
  newTotal: number;
  rankChange?: number;  // +5 means moved up 5 positions
}
```

### GET /api/leaderboard
```typescript
interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userEntry?: LeaderboardEntry;  // Current user's position
  period: LeaderboardPeriod;
}
```

### POST /api/dictionary
```typescript
interface DictionaryRequest {
  word: string;
  sourceLanguage: 'de';
  targetLanguage: Language;
}

interface DictionaryResponse {
  word: string;
  translation: string;
  definition: string;
  examples: string[];
  pronunciationUrl?: string;
}
```

---

## Sync Strategy

### Offline-First Approach

**When Online**:
1. Fetch data from API
2. Save to local cache (AsyncStorage)
3. Update UI

**When Offline**:
1. Read from local cache
2. Display cached data
3. Queue mutations (progress updates, points)

**When Reconnected**:
1. Sync queued mutations
2. Refresh cached data
3. Resolve conflicts (last-write-wins)

### Sync Queue Type

```typescript
interface SyncQueueItem {
  id: string;                    // Unique queue item ID
  type: SyncActionType;          // Type of action
  endpoint: string;              // API endpoint
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload: any;                  // Request payload
  timestamp: Date;               // When queued
  retryCount: number;            // Retry attempts
  maxRetries: number;            // Max retry attempts
}

enum SyncActionType {
  UpdateProgress = 'updateProgress',
  UpdatePoints = 'updatePoints',
  SaveVocabulary = 'saveVocabulary',
  CompleteLesson = 'completeLesson',
}
```

---

## Summary

**Total Entities**: 7 core entities  
**Total TypeScript Types**: 25+ interfaces/enums  
**Storage Layers**:
- AsyncStorage: Preferences, cached data
- SecureStore: Auth tokens
- FileSystem: Downloaded media files

**Key Design Decisions**:
1. **Denormalization**: User info in LeaderboardEntry for performance
2. **Optimistic UI**: Update UI immediately, sync in background
3. **Offline-first**: Cache everything, queue mutations
4. **Type safety**: Strict TypeScript types for all entities

---

**Next Steps**:
- ✅ Define API contracts ([contracts/](./contracts/))
- ✅ Create development quickstart guide ([quickstart.md](./quickstart.md))
- → Generate implementation tasks ([tasks.md](./tasks.md))

**Phase 1 Complete**: 2024-12-16
