# Lessons API

Handles lesson browsing, filtering, and details.

## Endpoints

### GET /api/lessons

List lessons with optional filtering and pagination.

**Authentication**: Optional (returns user-specific data if authenticated)

**Query Parameters**:
- `category` (string, optional): Filter by category slug
- `difficulty` (string, optional): Filter by difficulty ('beginner' | 'intermediate' | 'advanced')
- `search` (string, optional): Search in title/description
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 20, max: 100)

**Example Request**:
```
GET /api/lessons?category=daily-conversations&difficulty=beginner&page=1&limit=10
```

**Response 200**:
```json
{
  "lessons": [
    {
      "id": "lesson_123",
      "title": "At the Bakery",
      "description": "Learn how to order bread and pastries in German",
      "difficulty": "beginner",
      "category": {
        "id": "cat_1",
        "name": "Daily Conversations",
        "slug": "daily-conversations"
      },
      "categorySlug": "daily-conversations",
      "audioUrl": "https://papageil.net/audio/lesson_123.m4a",
      "videoUrl": "https://papageil.net/video/lesson_123.mp4",
      "thumbnailUrl": "https://i.ytimg.com/vi/abc123/mqdefault.jpg",
      "duration": 245,
      "viewCount": 1502,
      "createdAt": "2024-11-01T10:00:00Z",
      "updatedAt": "2024-12-01T15:30:00Z",
      "userProgress": {
        "status": "in_progress",
        "playbackPosition": 120,
        "completionPercentage": 48
      },
      "isDownloaded": false
    }
    // ... more lessons
  ],
  "total": 85,
  "page": 1,
  "limit": 10,
  "totalPages": 9
}
```

**Response Fields**:
- `userProgress`: Only present if user is authenticated and has started the lesson
- `isDownloaded`: Only present if user is authenticated

**Errors**:
- `400 BAD_REQUEST`: Invalid query parameters

---

### GET /api/lessons/[id]

Get detailed information about a specific lesson.

**Authentication**: Optional (returns user-specific data if authenticated)

**Path Parameters**:
- `id` (string): Lesson ID

**Example Request**:
```
GET /api/lessons/lesson_123
```

**Response 200**:
```json
{
  "lesson": {
    "id": "lesson_123",
    "title": "At the Bakery",
    "description": "Learn how to order bread and pastries in German. This lesson covers common phrases used in a bakery, including asking for specific items, quantities, and prices.",
    "difficulty": "beginner",
    "category": {
      "id": "cat_1",
      "name": "Daily Conversations",
      "slug": "daily-conversations",
      "color": "#4CAF50"
    },
    "categorySlug": "daily-conversations",
    "audioUrl": "https://papageil.net/audio/lesson_123.m4a",
    "videoUrl": "https://papageil.net/video/lesson_123.mp4",
    "thumbnailUrl": "https://i.ytimg.com/vi/abc123/mqdefault.jpg",
    "duration": 245,
    "viewCount": 1503,
    "transcript": [
      {
        "id": "seg_1",
        "text": "Guten Morgen! Was möchten Sie?",
        "translation": "Good morning! What would you like?",
        "startTime": 0,
        "endTime": 3.5
      },
      {
        "id": "seg_2",
        "text": "Ich hätte gerne zwei Brötchen, bitte.",
        "translation": "I would like two rolls, please.",
        "startTime": 3.5,
        "endTime": 7.2
      }
      // ... more segments
    ],
    "userProgress": {
      "id": "prog_456",
      "status": "in_progress",
      "playbackPosition": 120,
      "completionPercentage": 48,
      "pointsEarned": 0,
      "attemptsCount": 2,
      "startedAt": "2024-12-14T09:00:00Z",
      "lastAccessedAt": "2024-12-15T14:30:00Z"
    },
    "isDownloaded": false,
    "createdAt": "2024-11-01T10:00:00Z",
    "updatedAt": "2024-12-01T15:30:00Z"
  },
  "relatedLessons": [
    {
      "id": "lesson_124",
      "title": "At the Supermarket",
      "difficulty": "beginner",
      "thumbnailUrl": "https://...",
      "duration": 312
    }
    // ... up to 4 related lessons
  ]
}
```

**Errors**:
- `404 NOT_FOUND`: Lesson not found

---

### POST /api/lessons/[id]/view

Increment view count for a lesson.

**Authentication**: Optional

**Path Parameters**:
- `id` (string): Lesson ID

**Request Body**: None

**Response 200**:
```json
{
  "viewCount": 1504
}
```

**Errors**:
- `404 NOT_FOUND`: Lesson not found

**Rate Limiting**: Max 1 request per lesson per user per hour (tracked by IP if not authenticated)

---

### GET /api/article-categories

List all lesson categories.

**Authentication**: Optional

**Query Parameters**:
- `activeOnly` (boolean, optional): Only return active categories (default: false)

**Example Request**:
```
GET /api/article-categories?activeOnly=true
```

**Response 200**:
```json
{
  "categories": [
    {
      "id": "cat_1",
      "name": "Daily Conversations",
      "slug": "daily-conversations",
      "description": "Common phrases for everyday situations",
      "iconName": "chat",
      "color": "#4CAF50",
      "order": 1,
      "lessonCount": 28,
      "isActive": true,
      "createdAt": "2024-10-01T10:00:00Z",
      "updatedAt": "2024-12-01T10:00:00Z"
    },
    {
      "id": "cat_2",
      "name": "Business German",
      "slug": "business-german",
      "description": "Professional language for work settings",
      "iconName": "briefcase",
      "color": "#2196F3",
      "order": 2,
      "lessonCount": 15,
      "isActive": true,
      "createdAt": "2024-10-01T10:00:00Z",
      "updatedAt": "2024-12-01T10:00:00Z"
    }
    // ... more categories
  ]
}
```

---

## Filtering Logic

### Difficulty Levels

```
beginner: A1-A2 CEFR levels
intermediate: B1-B2 CEFR levels
advanced: C1-C2 CEFR levels
```

### Search Algorithm

When `search` parameter is provided, API searches in:
1. Lesson title (weighted 3x)
2. Lesson description (weighted 2x)
3. Category name (weighted 1x)

Returns results sorted by relevance score.

---

## Caching Recommendations

**Mobile App Should Cache**:
- Lesson lists: 5 minutes
- Lesson details: 1 hour
- Categories: 1 day

**Cache Invalidation**:
- On user action (complete lesson, start new lesson)
- On manual refresh (pull-to-refresh)

---

## Performance Considerations

1. **Pagination**: Always use pagination to avoid loading 100+ lessons at once
2. **Lazy Loading**: Load transcript only when lesson detail is opened
3. **Image Optimization**: Thumbnail URLs support size parameters: `?size=small|medium|large`
4. **Prefetching**: Consider prefetching next page when user scrolls to 80% of current page

---

## Example Mobile Implementation

```typescript
// src/hooks/useLessons.ts
import useSWR from 'swr';
import api from '@/services/api';

export function useLessons(
  categorySlug?: string,
  difficulty?: string,
  page: number = 1
) {
  const params = new URLSearchParams();
  if (categorySlug) params.append('category', categorySlug);
  if (difficulty) params.append('difficulty', difficulty);
  params.append('page', page.toString());
  params.append('limit', '20');

  const { data, error, mutate } = useSWR(
    `/lessons?${params.toString()}`,
    (url) => api.get(url).then((res) => res.data),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    lessons: data?.lessons || [],
    total: data?.total || 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}
```
