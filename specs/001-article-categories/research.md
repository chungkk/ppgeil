# Research: Article Category System

**Feature**: 001-article-categories  
**Date**: 2025-12-14  
**Status**: Complete

## Overview

This document consolidates research findings for implementing the article category system. Key areas investigated: Vietnamese slug generation, data modeling approach, default category enforcement, and transaction handling for category operations.

---

## Research Topic 1: Vietnamese Slug Generation

### Decision
Use a JavaScript slug generation utility that properly handles Vietnamese diacritics by converting them to ASCII equivalents.

### Rationale
- Vietnamese has diacritical marks (ă, â, đ, ê, ô, ơ, ư, etc.) that need URL-safe conversion
- Existing library solutions (e.g., `slugify`) don't handle Vietnamese well without configuration
- Custom implementation needed to map Vietnamese → ASCII → URL-safe slug
- Must handle: spaces → hyphens, lowercase conversion, special character removal

### Implementation Approach
```javascript
// Vietnamese character mapping
const vietnameseMap = {
  'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
  'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
  'ì|í|ị|ỉ|ĩ': 'i',
  'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
  'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
  'ỳ|ý|ỵ|ỷ|ỹ': 'y',
  'đ': 'd',
  'À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ': 'A',
  'È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ': 'E',
  'Ì|Í|Ị|Ỉ|Ĩ': 'I',
  'Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ': 'O',
  'Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ': 'U',
  'Ỳ|Ý|Ỵ|Ỷ|Ỹ': 'Y',
  'Đ': 'D'
};

function toSlug(str) {
  // Convert Vietnamese characters
  for (const [pattern, replacement] of Object.entries(vietnameseMap)) {
    str = str.replace(new RegExp(pattern, 'g'), replacement);
  }
  
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-')  // Replace spaces/underscores with hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
}
```

### Examples
- "Ngữ pháp Đức" → "ngu-phap-duc"
- "Từ vựng A1" → "tu-vung-a1"
- "Chưa phân loại" → "chua-phan-loai"

### Alternatives Considered
- **npm `slugify` package**: Doesn't handle Vietnamese well, would need custom charMap which is similar effort
- **Server-side transliteration services**: Adds external dependency and latency
- **Store original + slug separately**: Chosen approach - allows manual override if needed

---

## Research Topic 2: Category Data Model

### Decision
Create a separate `ArticleCategory` Mongoose model (not embedded strings).

### Rationale
**Advantages of Separate Model:**
- Centralized category management (CRUD operations)
- Metadata support (description, slug, timestamps, isActive, isSystem)
- Article count aggregation
- Prevents duplicate category names across articles
- Easier to implement "cannot delete default" logic
- Better query performance for category lists

**Why Not Embedded Strings:**
- Vocabulary categories use embedded strings (`category: String`) - simpler but limited
- For articles, we need: slugs, descriptions, active/inactive status, system flag
- Renaming categories with embedded strings requires updating all articles
- No way to prevent default category deletion with embedded approach

### Schema Design
```javascript
const ArticleCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false  // true for "Chưa phân loại"
  },
  articleCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true  // createdAt, updatedAt
});
```

### Lesson Model Extension
```javascript
// Add to existing LessonSchema
category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ArticleCategory',
  required: true  // Every lesson must have category
}
```

### Alternatives Considered
- **Embedded string approach**: Used by Vocabulary, but lacks needed features
- **Tags/many-to-many**: Requirement specifies single category per article
- **Enum-based categories**: Too rigid, requires code changes to add categories

---

## Research Topic 3: Default Category Enforcement

### Decision
Use `isSystem: true` flag with application-level enforcement in API routes.

### Rationale
- MongoDB doesn't support row-level deletion prevention
- Application logic must check `isSystem` flag before allowing delete
- Seed default category on first API call if doesn't exist
- Mongoose middleware can validate but not prevent admin actions

### Implementation Strategy
1. **Seed on Startup**: Check if "Chưa phân loại" exists, create if not
2. **Delete Protection**: API route checks `isSystem` flag
3. **UI Indication**: Disable delete button for system categories in admin UI

```javascript
// In DELETE /api/article-categories
const category = await ArticleCategory.findById(req.query.id);
if (category.isSystem) {
  return res.status(403).json({ 
    error: 'Không thể xóa danh mục hệ thống' 
  });
}
```

### Seeding Logic
```javascript
// In GET /api/article-categories (or on app init)
async function ensureDefaultCategory() {
  const defaultExists = await ArticleCategory.findOne({ 
    slug: 'chua-phan-loai' 
  });
  
  if (!defaultExists) {
    await ArticleCategory.create({
      name: 'Chưa phân loại',
      slug: 'chua-phan-loai',
      description: 'Danh mục mặc định cho bài viết chưa được phân loại',
      isSystem: true,
      isActive: true
    });
  }
}
```

### Alternatives Considered
- **Database constraints**: MongoDB doesn't support this natively
- **Mongoose middleware**: Pre('remove') hooks can block but are bypassable
- **Separate system_categories collection**: Over-engineered for single default category
- **Hard-coded default ID**: Brittle, breaks if database is reset

---

## Research Topic 4: Transaction Handling for Category Deletion

### Decision
Use Mongoose transactions (MongoDB sessions) for atomic category deletion + article reassignment.

### Rationale
- Prevent orphaned articles if deletion succeeds but reassignment fails
- MongoDB 4.0+ supports multi-document transactions
- Mongoose provides simple `session` API
- Atomic operation ensures data integrity per requirement FR-029

### Implementation Pattern
```javascript
// DELETE /api/article-categories
const session = await mongoose.startSession();
session.startTransaction();

try {
  const category = await ArticleCategory.findById(categoryId).session(session);
  
  if (!category) {
    throw new Error('Category not found');
  }
  
  if (category.isSystem) {
    throw new Error('Cannot delete system category');
  }
  
  // Get default category
  const defaultCategory = await ArticleCategory.findOne({ 
    isSystem: true 
  }).session(session);
  
  // Reassign all articles to default
  await Lesson.updateMany(
    { category: categoryId },
    { $set: { category: defaultCategory._id } },
    { session }
  );
  
  // Delete the category
  await ArticleCategory.findByIdAndDelete(categoryId).session(session);
  
  // Update article counts
  await updateArticleCounts(session);
  
  await session.commitTransaction();
  res.status(200).json({ message: 'Đã xóa danh mục' });
  
} catch (error) {
  await session.abortTransaction();
  res.status(500).json({ error: error.message });
} finally {
  session.endSession();
}
```

### Transaction Requirements
- MongoDB replica set or sharded cluster (transactions not supported on standalone)
- Mongoose 5.2.0+ (project has 8.19.2 ✅)
- MongoDB 4.0+ server (need to verify in production)

### Alternatives Considered
- **Two-phase commit**: Manual rollback is complex and error-prone
- **Optimistic locking**: Doesn't prevent partial failures
- **Queue-based async processing**: Over-engineered for simple operation
- **No transactions**: Acceptable risk if production is standalone MongoDB, but bad practice

### Fallback Strategy
If transactions aren't available (standalone MongoDB):
1. Check article count first
2. Perform reassignment
3. Wait for confirmation
4. Then delete category
5. Log any inconsistencies for manual cleanup

---

## Research Topic 5: Existing Patterns in Codebase

### Findings

**Vocabulary Categories Pattern** (`pages/api/vocabulary/categories.js`):
- Uses embedded string field (`category: String`)
- CRUD via distinct() for reading categories
- updateMany() for bulk rename
- Default to "Allgemein" on delete
- **Limitation**: No slugs, descriptions, or metadata

**PageContent Pattern** (`models/PageContent.js`):
- Uses enum for fixed pages
- Static methods for getPageContent/updatePageContent
- Good pattern for seeding default content

**Lesson Pattern** (`lib/models/Lesson.js`):
- ObjectId references not used yet (all fields are primitives)
- This will be first use of ref: 'ArticleCategory'
- Existing pagination pattern can be extended for category filtering

### Pattern Decision
Combine best of all patterns:
- Separate model like PageContent approach
- Bulk operations support like Vocabulary categories
- Reference pattern (new to codebase but standard Mongoose)
- Static methods for common operations

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Slug Generation | Custom Vietnamese → ASCII mapper | Proper URL-safe Vietnamese support |
| Data Model | Separate ArticleCategory model | Rich metadata + centralized management |
| Default Category | isSystem flag + API enforcement | Prevents accidental deletion |
| Transactions | Mongoose sessions (with fallback) | Data integrity during deletion |
| Pattern | Hybrid of existing patterns | Consistent with codebase style |

---

## Open Questions & Next Steps

**Resolved Questions:**
- ✅ Vietnamese slug generation approach
- ✅ Embedded vs separate model
- ✅ Default category enforcement
- ✅ Transaction support

**Next Steps:**
1. Verify MongoDB version in production (transactions require 4.0+)
2. Create data model documentation (data-model.md)
3. Define API contracts (contracts/article-categories-api.yaml)
4. Generate quickstart guide for developers

**Dependencies to Install:**
- None (all features use existing dependencies)

**Environment Variables:**
- No new variables needed (uses existing MONGODB_URI)
