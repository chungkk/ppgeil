# Dictionary Cache Admin Guide

## Overview

This guide explains how to manage the dictionary cache system, including versioning, invalidation, and monitoring.

## Cache Versioning

The cache uses a version system to ensure data consistency across updates.

### How It Works

- Cache version is defined in `/pages/api/dictionary.js`:
  ```javascript
  const CACHE_VERSION = 'v1'; // Current version
  ```

- Each cache entry includes the version in its key: `word_language_version`
- When you bump the version (e.g., `v1` → `v2`), old cache entries are automatically invalidated

### When to Bump Version

Increment `CACHE_VERSION` when:
- ✅ You change the AI prompt
- ✅ You modify the response format
- ✅ You switch AI models (GPT-4 → GPT-4.5)
- ✅ You fix errors in dictionary logic

**Example:**
```javascript
// Before making changes
const CACHE_VERSION = 'v1';

// After updating AI prompt
const CACHE_VERSION = 'v2'; // Bump version
```

Old `v1` entries will be auto-deleted during cleanup.

---

## Admin Endpoints

### 1. Cache Stats (GET)

**Endpoint:** `GET /api/admin/cache/stats`

**Headers:**
```bash
Authorization: Bearer your-secret-admin-token
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalEntries": 1250,
    "hitStats": {
      "totalHits": 15420,
      "avgHits": 12.3,
      "maxHits": 245
    },
    "versionDistribution": [
      { "_id": "v1", "count": 1250 }
    ],
    "languageDistribution": [
      { "_id": "vi", "count": 980 },
      { "_id": "en", "count": 270 }
    ],
    "topWords": [
      {
        "word": "haus",
        "targetLang": "vi",
        "hits": 245,
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "ageDistribution": {
      "last24h": 45,
      "last7days": 320,
      "older": 885
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/admin/cache/stats \
  -H "Authorization: Bearer your-secret-admin-token"
```

---

### 2. Cache Invalidation (POST/DELETE)

**Endpoint:** `POST /api/admin/cache/invalidate`

**Headers:**
```bash
Authorization: Bearer your-secret-admin-token
Content-Type: application/json
```

#### Clear Specific Word

**Request:**
```json
{
  "word": "haus",
  "targetLang": "vi"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared cache for word \"haus\"",
  "deletedCount": 1
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/admin/cache/invalidate \
  -H "Authorization: Bearer your-secret-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"word":"haus","targetLang":"vi"}'
```

#### Clear All Words (specific language)

**Request:**
```json
{
  "word": "haus"
}
```

This clears "haus" for ALL languages.

#### Clear Specific Version

**Request:**
```json
{
  "version": "v1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared all cache entries for version v1",
  "deletedCount": 1250
}
```

#### Clear All Cache

**Request:**
```json
{
  "clearAll": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared all cache entries",
  "deletedCount": 1250
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/admin/cache/invalidate \
  -H "Authorization: Bearer your-secret-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"clearAll":true}'
```

---

## Setup Admin Token

Add to `.env.local`:

```env
ADMIN_TOKEN=your-super-secret-token-here
```

Generate a secure token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Cache Monitoring

### Console Logs

The cache system logs all operations:

```
✅ Cache hit for "haus" (hits: 15)
❌ Cache miss for "katze"
💾 Cached "katze" (version: v1)
🧹 Cleaned up 45 old cache entries
```

### Metrics to Monitor

1. **Hit Rate**: `totalHits / totalEntries` - Higher is better
2. **Cache Size**: `totalEntries` - Monitor storage usage
3. **Top Words**: Identify most valuable cached words
4. **Age Distribution**: Check if cleanup is working

---

## Common Workflows

### Scenario 1: Update AI Prompt

```bash
# 1. Update prompt in dictionary.js
# 2. Bump version
const CACHE_VERSION = 'v2';

# 3. Deploy
# 4. Old v1 cache will auto-cleanup in background
```

### Scenario 2: Fix Wrong Translation

```bash
# Clear specific word
curl -X POST http://localhost:3000/api/admin/cache/invalidate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"word":"berlin","targetLang":"vi"}'

# Word will be re-cached on next request with correct data
```

### Scenario 3: Emergency - Clear Everything

```bash
curl -X POST http://localhost:3000/api/admin/cache/invalidate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clearAll":true}'
```

---

## Best Practices

1. ✅ **Always bump version** when changing AI logic
2. ✅ **Monitor cache stats** weekly
3. ✅ **Keep ADMIN_TOKEN secret** - never commit to git
4. ✅ **Test invalidation** in staging first
5. ❌ **Don't clear all cache** unless emergency
6. ❌ **Don't modify version** without understanding impact

---

## Troubleshooting

### Problem: Cache hit rate is low

**Check:**
- Are users searching for unique/rare words?
- Is cache expiry too short?
- Are there many different target languages?

### Problem: Cache size is too large

**Solutions:**
- Reduce `CACHE_EXPIRY_DAYS` from 7 to 3
- Implement LRU eviction (advanced)
- Clear old versions: `{"version": "v1"}`

### Problem: Users seeing outdated data

**Solutions:**
- Bump `CACHE_VERSION` to invalidate all
- Clear specific word if known
- Reduce expiry time

---

## Production Checklist

Before deploying to production:

- [ ] Set strong `ADMIN_TOKEN` in env
- [ ] Test cache invalidation endpoint
- [ ] Verify logs show hit/miss correctly
- [ ] Monitor initial cache population
- [ ] Set up alerts for cache size/errors
- [ ] Document current `CACHE_VERSION` in changelog

---

## API Reference Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/cache/stats` | GET | Required | View cache statistics |
| `/api/admin/cache/invalidate` | POST | Required | Clear cache entries |

**Auth Header:**
```
Authorization: Bearer your-secret-admin-token
```

---

For questions or issues, check server logs or contact the development team.
