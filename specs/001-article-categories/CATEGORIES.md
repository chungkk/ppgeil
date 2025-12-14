# Article Category System - Documentation

## Overview

The article category system allows administrators to organize articles/lessons into categories and enables users to filter articles by category. This feature includes:

- **Admin Management**: Full CRUD interface for category management
- **Category Assignment**: Assign categories to articles/lessons
- **User Filtering**: Browse and filter articles by category on homepage
- **Vietnamese Support**: Automatic slug generation for Vietnamese category names
- **Data Integrity**: System category protection and automatic article reassignment

## User Stories

### US1 (P1): Admin Creates and Manages Categories
- Admins can create new categories with Vietnamese names
- Categories auto-generate URL-friendly slugs (e.g., "Ngữ pháp" → "ngu-phap")
- Admins can edit category name, description, and active status
- Admins can delete categories (with article reassignment to default)
- System category "Chưa phân loại" cannot be deleted

### US2 (P2): Admin Assigns Categories to Articles
- Admins can assign one category to each article when creating or editing
- New articles without a category are auto-assigned to "Chưa phân loại"
- Category dropdown shows all categories (active and inactive for admins)
- Articles are updated when their category is deleted (moved to default)

### US3 (P3): Users Browse and Filter by Category
- Homepage displays category filter pills
- Users can click any category to filter articles
- Filtered URLs are bookmarkable (e.g., `/?category=ngu-phap`)
- "Tất cả" button clears the filter
- Category tags appear on article cards and are clickable
- Works with existing difficulty filters (beginner/experienced)

## Architecture

### Database Models

#### ArticleCategory
- **Fields**: name, slug, description, isActive, isSystem, articleCount, order, createdAt, updatedAt
- **Indexes**: Unique on `name` and `slug`, compound index on `isActive + order`
- **Location**: `lib/models/ArticleCategory.js`

#### Lesson (Modified)
- **Added Field**: `category` (ObjectId reference to ArticleCategory, required)
- **Indexes**: Single index on `category`, compound indexes on `{category: 1, createdAt: -1}` and `{level: 1, category: 1}`
- **Location**: `lib/models/Lesson.js`

### API Endpoints

All endpoints are at `/api/article-categories`:

**Public Endpoints**:
- `GET /api/article-categories?activeOnly=true` - List active categories

**Admin Endpoints** (require Bearer token with admin role):
- `POST /api/article-categories` - Create category
- `PUT /api/article-categories` - Update category
- `DELETE /api/article-categories?id={id}` - Delete category

**Lesson API** (extended):
- `GET /api/lessons?category={slug}` - Filter lessons by category slug

See `specs/001-article-categories/contracts/api-spec.yaml` for full OpenAPI specification.

### Components

**Frontend Components**:
- `CategoryFilter` - Horizontal scrollable category pills (`components/CategoryFilter.js`)
- `CategoryTag` - Clickable category badge (`components/CategoryTag.js`)

**Admin Components**:
- Admin category management page (`pages/admin/dashboard/article-categories.js`)
- Category dropdown in lesson edit form (`pages/admin/dashboard/lesson/[id]/index.js`)

## Usage

### For Administrators

#### Creating a Category
1. Navigate to **Admin Dashboard** → **Quản lý danh mục bài viết**
2. Click **"+ Tạo danh mục mới"**
3. Enter category name (Vietnamese supported)
4. Optionally add description
5. Click **"Tạo"**
6. Slug auto-generates from name

#### Assigning Categories to Lessons
1. Navigate to **Admin Dashboard** → **Lessons**
2. Click on a lesson to edit
3. Find **"Danh mục"** dropdown
4. Select a category
5. Save the lesson

#### Deleting a Category
1. Go to category management page
2. Click **"Xóa"** on the category
3. Confirm deletion
4. All articles in that category will be moved to "Chưa phân loại"

**Note**: System category "Chưa phân loại" cannot be deleted.

### For End Users

#### Filtering by Category
1. Visit homepage
2. See category filter pills at the top
3. Click any category to filter articles
4. Click **"Tất cả"** to clear filter

#### Bookmarking Filters
- Filtered URLs are shareable: `https://yourdomain.com/?category=ngu-phap`
- Browser back/forward buttons work correctly
- Works with difficulty filters: `/?category=ngu-phap&difficulty=beginner`

## Vietnamese Slug Generation

The system auto-converts Vietnamese category names to URL-friendly slugs:

**Examples**:
- "Ngữ pháp Đức" → "ngu-phap-duc"
- "Từ vựng A1" → "tu-vung-a1"
- "Bài học thực hành" → "bai-hoc-thuc-hanh"

**Algorithm**:
1. Convert Vietnamese diacritics to ASCII (ă→a, đ→d, etc.)
2. Convert to lowercase
3. Replace spaces with hyphens
4. Remove special characters
5. Collapse multiple hyphens
6. Trim hyphens from ends

## Data Migration

For existing projects, a migration script is provided to:
1. Create default "Chưa phân loại" category
2. Assign all existing lessons to the default category
3. Update Lesson schema to require category field

**Run migration**:
```bash
node scripts/migrate-lessons-categories.js
```

See `specs/001-article-categories/MIGRATION.md` for detailed migration guide.

## MongoDB Requirements

- **Version**: MongoDB 4.0+ (for multi-document transactions)
- **Topology**: Replica Set (for transaction support)
- **Standalone**: Fallback implementation available (non-atomic)

See `MIGRATION.md` for details on MongoDB version requirements.

## Performance Considerations

### Caching
- Category list API has 5-minute cache with stale-while-revalidate
- Client-side SWR caching with 30-second auto-revalidation
- Prefetching support for next page of filtered results

### Indexes
- Unique indexes on `name` and `slug` prevent duplicates
- Compound index `{isActive: 1, order: 1}` optimizes active category queries
- Compound index `{category: 1, createdAt: -1}` optimizes filtered lesson queries

### Aggregation
- Article counts computed efficiently using `countDocuments`
- Category filter uses indexed queries

## SEO Benefits

- Bookmarkable category URLs improve SEO
- Each filtered view is a unique URL (e.g., `/?category=ngu-phap`)
- Category tags add structured metadata to pages
- Breadcrumbs can be enhanced with category info

## Translations

Vietnamese translations are available in `public/locales/vi/common.json`:

```json
{
  "categories": {
    "title": "Danh mục",
    "all": "Tất cả",
    "filter": "Lọc theo danh mục",
    "admin": { ... }
  }
}
```

## Troubleshooting

### Category Creation Fails
- **Error**: "Tên danh mục đã tồn tại"
  - **Fix**: Category names must be unique (case-insensitive)

### Slug Conflict
- **Error**: "Slug đã tồn tại"
  - **Fix**: Slugs are auto-generated but must be unique. Try a different name.

### Cannot Delete Category
- **Error**: "Không thể xóa danh mục hệ thống"
  - **Fix**: System category "Chưa phân loại" is protected. You cannot delete it.

### Transaction Error
- **Error**: "Transaction numbers only allowed on replica set"
  - **Fix**: MongoDB standalone doesn't support transactions. The API will use fallback implementation (non-atomic but functional).

### Category Not Showing in Filter
- **Check**: Is category marked as active (`isActive: true`)?
- **Check**: Are there any articles in this category?
- **Fix**: Set `isActive: true` in admin panel

## Testing

### Manual Testing Checklist
1. ✅ Create category with Vietnamese name
2. ✅ Assign category to lesson
3. ✅ Filter lessons by category on homepage
4. ✅ Click category tag on lesson card
5. ✅ Delete category (verify articles moved to default)
6. ✅ Verify system category cannot be deleted
7. ✅ Test browser back/forward buttons
8. ✅ Test bookmarking filtered URL
9. ✅ Test with difficulty filters combined

### Automated Testing
- API endpoint tests: `tests/api/article-categories.test.js` (to be added)
- Model validation tests: `tests/models/ArticleCategory.test.js` (to be added)
- Component tests: `tests/components/CategoryFilter.test.js` (to be added)

## Future Enhancements

Potential features for future iterations:
- [ ] Hierarchical categories (parent-child relationships)
- [ ] Multiple categories per article
- [ ] Category icons/images
- [ ] Category descriptions with rich text
- [ ] Analytics per category (views, completions)
- [ ] Automatic category suggestions based on content
- [ ] Category-specific SEO meta tags

## Support

For questions or issues:
- Check `specs/001-article-categories/quickstart.md` for quick examples
- Review `specs/001-article-categories/contracts/` for API details
- See `specs/001-article-categories/tasks.md` for implementation details

---

**Last Updated**: 2025-12-14  
**Version**: 1.0.0  
**Feature Branch**: `001-article-categories`
