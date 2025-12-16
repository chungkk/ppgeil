# API Contracts

This directory contains API contract specifications for the mobile app's interaction with the Next.js backend.

## Contract Files

- [auth-api.md](./auth-api.md) - Authentication endpoints
- [lessons-api.md](./lessons-api.md) - Lesson browsing and details
- [progress-api.md](./progress-api.md) - User progress tracking
- [leaderboard-api.md](./leaderboard-api.md) - Rankings and achievements
- [dictionary-api.md](./dictionary-api.md) - Vocabulary lookup

## Base URL

```
Production: https://papageil.net/api
Development: http://localhost:3000/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Common Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Rate Limiting

- Authenticated requests: 1000 requests/hour
- Unauthenticated requests: 100 requests/hour
- Dictionary lookups: 100 requests/minute

## Pagination

List endpoints support pagination with query parameters:

```
?page=1&limit=20
```

Default values:
- `page`: 1
- `limit`: 20
- Maximum `limit`: 100

## Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

## Versioning

API version is included in the base URL path. Current version: v1 (implicit).

Future versions will use explicit versioning: `/api/v2/...`
