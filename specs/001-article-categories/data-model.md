# Data Model: Article Category System

**Feature**: 001-article-categories  
**Date**: 2025-12-14  
**Status**: Ready for Implementation

## Overview

This document defines the data entities, relationships, validation rules, and state transitions for the article category system. The model supports single-category assignment per article with a protected default category.

---

## Entity 1: ArticleCategory

### Purpose
Represents a classification category for articles/lessons with metadata for display, filtering, and management.

### Schema Definition

```javascript
// Location: lib/models/ArticleCategory.js

import mongoose from 'mongoose';

const ArticleCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên danh mục là bắt buộc'],
    unique: true,
    trim: true,
    minlength: [1, 'Tên danh mục phải có ít nhất 1 ký tự'],
    maxlength: [100, 'Tên danh mục không được vượt quá 100 ký tự'],
    validate: {
      validator: function(v) {
        return /\S/.test(v); // At least one non-whitespace character
      },
      message: 'Tên danh mục không được chỉ chứa khoảng trắng'
    }
  },
  
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
      },
      message: 'Slug phải chỉ chứa chữ thường, số và dấu gạch ngang'
    }
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
    default: ''
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true  // Frequently queried for user-facing lists
  },
  
  isSystem: {
    type: Boolean,
    default: false,
    immutable: true  // Cannot be changed after creation
  },
  
  articleCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  order: {
    type: Number,
    default: 0,
    index: true  // For sorting category lists
  }
  
}, {
  timestamps: true,  // Adds createdAt and updatedAt
  collection: 'articlecategories'
});

// Indexes
ArticleCategorySchema.index({ name: 1 });
ArticleCategorySchema.index({ slug: 1 });
ArticleCategorySchema.index({ isActive: 1, order: 1 });

// Static Methods
ArticleCategorySchema.statics.getDefaultCategory = async function() {
  return await this.findOne({ isSystem: true });
};

ArticleCategorySchema.statics.getActiveCategories = async function() {
  return await this.find({ isActive: true }).sort({ order: 1, name: 1 });
};

ArticleCategorySchema.statics.getCategoryWithCount = async function(categoryId) {
  const category = await this.findById(categoryId);
  if (!category) return null;
  
  const Lesson = mongoose.model('Lesson');
  const count = await Lesson.countDocuments({ category: categoryId });
  
  return { ...category.toObject(), articleCount: count };
};

// Instance Methods
ArticleCategorySchema.methods.canDelete = function() {
  return !this.isSystem;
};

// Pre-save hook: Generate slug if not provided
ArticleCategorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }
  next();
});

// Helper function for slug generation
function generateSlug(str) {
  const vietnameseMap = {
    'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
    'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
    'ì|í|ị|ỉ|ĩ': 'i',
    'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
    'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
    'ỳ|ý|ỵ|ỷ|ỹ': 'y',
    'đ': 'd',
    'À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ': 'a',
    'È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ': 'e',
    'Ì|Í|Ị|Ỉ|Ĩ': 'i',
    'Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ': 'o',
    'Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ': 'u',
    'Ỳ|Ý|Ỵ|Ỷ|Ỹ': 'y',
    'Đ': 'd'
  };
  
  let slug = str;
  for (const [pattern, replacement] of Object.entries(vietnameseMap)) {
    slug = slug.replace(new RegExp(pattern, 'g'), replacement);
  }
  
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const ArticleCategory = mongoose.models.ArticleCategory || 
  mongoose.model('ArticleCategory', ArticleCategorySchema);
```

### Field Descriptions

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| name | String | Required, unique, 1-100 chars | Display name (supports Vietnamese) |
| slug | String | Required, unique, lowercase, URL-safe | URL-friendly identifier |
| description | String | Optional, max 500 chars | Admin notes about category usage |
| isActive | Boolean | Default true | Show/hide from user-facing interfaces |
| isSystem | Boolean | Default false, immutable | Prevents deletion (for default category) |
| articleCount | Number | Min 0, default 0 | Cached count (updated via aggregation) |
| order | Number | Default 0 | Sort order for category lists |
| createdAt | Date | Auto-generated | Record creation timestamp |
| updatedAt | Date | Auto-updated | Last modification timestamp |

### Validation Rules (from FR-026 to FR-028)

1. **Name validation**:
   - Cannot be empty or whitespace-only
   - Must be 1-100 characters
   - Must be unique (case-insensitive check at API level)
   - Trimmed before saving

2. **Slug validation**:
   - Auto-generated from name if not provided
   - Must match pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
   - Must be unique
   - Manual override allowed via API

3. **Description validation**:
   - Optional field
   - Max 500 characters if provided

4. **System category protection**:
   - `isSystem: true` categories cannot be deleted
   - Only one system category should exist ("Chưa phân loại")

### Indexes

```javascript
// Performance indexes
db.articlecategories.createIndex({ name: 1 });
db.articlecategories.createIndex({ slug: 1 });
db.articlecategories.createIndex({ isActive: 1, order: 1 });
```

### Example Documents

```javascript
// Default system category
{
  "_id": ObjectId("..."),
  "name": "Chưa phân loại",
  "slug": "chua-phan-loai",
  "description": "Danh mục mặc định cho bài viết chưa được phân loại",
  "isActive": true,
  "isSystem": true,
  "articleCount": 5,
  "order": 0,
  "createdAt": ISODate("2025-12-14T..."),
  "updatedAt": ISODate("2025-12-14T...")
}

// Regular category
{
  "_id": ObjectId("..."),
  "name": "Ngữ pháp",
  "slug": "ngu-phap",
  "description": "Bài viết về ngữ pháp tiếng Đức",
  "isActive": true,
  "isSystem": false,
  "articleCount": 23,
  "order": 1,
  "createdAt": ISODate("2025-12-14T..."),
  "updatedAt": ISODate("2025-12-14T...")
}

// Inactive category
{
  "_id": ObjectId("..."),
  "name": "Lỗi thời",
  "slug": "loi-thoi",
  "description": "",
  "isActive": false,
  "isSystem": false,
  "articleCount": 0,
  "order": 99,
  "createdAt": ISODate("2025-12-01T..."),
  "updatedAt": ISODate("2025-12-14T...")
}
```

---

## Entity 2: Lesson (Modified)

### Purpose
Extend existing Lesson model to support single category assignment.

### Schema Modification

```javascript
// Location: lib/models/Lesson.js
// Add this field to existing LessonSchema

category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ArticleCategory',
  required: [true, 'Mỗi bài học phải có danh mục'],
  index: true  // For filtering queries
}
```

### Migration Considerations

**Existing lessons without category**:
- Need migration script to assign default category
- Run before deploying new code

```javascript
// Migration script
import mongoose from 'mongoose';
import { Lesson } from './lib/models/Lesson.js';
import { ArticleCategory } from './lib/models/ArticleCategory.js';

async function migrateLessons() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Ensure default category exists
  let defaultCategory = await ArticleCategory.findOne({ isSystem: true });
  if (!defaultCategory) {
    defaultCategory = await ArticleCategory.create({
      name: 'Chưa phân loại',
      slug: 'chua-phan-loai',
      description: 'Danh mục mặc định',
      isSystem: true,
      isActive: true
    });
  }
  
  // Assign default category to lessons without category
  const result = await Lesson.updateMany(
    { category: { $exists: false } },
    { $set: { category: defaultCategory._id } }
  );
  
  console.log(`Updated ${result.modifiedCount} lessons`);
  await mongoose.disconnect();
}
```

### Updated Lesson Schema (Complete)

```javascript
import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  displayTitle: {
    type: String,
    required: false
  },
  description: {
    type: String
  },
  level: {
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    default: 'A1'
  },
  category: {  // NEW FIELD
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArticleCategory',
    required: true,
    index: true
  },
  audio: {
    type: String,
    required: true
  },
  youtubeUrl: {
    type: String,
    required: false
  },
  thumbnail: {
    type: String,
    required: false
  },
  json: {
    type: String,
    required: true
  },
  videoDuration: {
    type: Number,
    required: false
  },
  order: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
LessonSchema.index({ category: 1, createdAt: -1 });  // For category filtering
LessonSchema.index({ level: 1, category: 1 });        // For combined filters

export const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
```

---

## Relationships

### One-to-Many: ArticleCategory → Lesson

```text
ArticleCategory (1) ──────> Lesson (N)
      ↑                        ↓
      └─── category (ObjectId)
```

**Relationship Type**: One category has many lessons, each lesson belongs to exactly one category.

**Referential Integrity**:
- When category is deleted → reassign all lessons to default category
- Cannot delete default category (isSystem: true)
- Category deletion uses MongoDB transaction for atomicity

**Query Patterns**:

```javascript
// Get all lessons in a category
const lessons = await Lesson.find({ category: categoryId })
  .sort({ createdAt: -1 })
  .limit(12);

// Get category with populated lessons
const category = await ArticleCategory.findById(categoryId);
const lessons = await Lesson.find({ category: categoryId }).limit(5);

// Get lesson with category details
const lesson = await Lesson.findById(lessonId).populate('category');
// lesson.category.name, lesson.category.slug, etc.
```

---

## State Transitions

### ArticleCategory Lifecycle

```text
[Created] ──────> [Active] ──────> [Inactive] ──────> [Deleted]
                      ↓                 ↓
                      └─────────────────┘
                      (can toggle active/inactive)
                      
[System Category] ──> [Active] (cannot be deleted or set inactive)
```

**State Rules**:
1. **Created → Active**: New categories are active by default
2. **Active ↔ Inactive**: Can toggle (except system categories stay active)
3. **Inactive → Deleted**: Can delete if not system category
4. **System Category**: Cannot transition to deleted state

### Category Deletion Workflow (FR-011)

```text
1. Check isSystem flag
   ├─ true:  Reject deletion (403 Forbidden)
   └─ false: Proceed to step 2

2. Start MongoDB transaction

3. Find default category (isSystem: true)

4. Reassign all lessons to default
   Lesson.updateMany({ category: deletedId }, { category: defaultId })

5. Delete category
   ArticleCategory.findByIdAndDelete(deletedId)

6. Update article counts
   (Optional: can be lazy-updated)

7. Commit transaction
   ├─ success: Return 200 OK
   └─ failure: Rollback, return 500 Error
```

---

## Validation Summary

### Creation Validation
- ✅ Name: Required, 1-100 chars, unique, non-whitespace
- ✅ Slug: Auto-generated or custom, unique, URL-safe
- ✅ Description: Optional, max 500 chars
- ✅ isActive: Default true
- ✅ isSystem: Default false (only set true for default category)

### Update Validation
- ✅ Name: Same rules as creation
- ✅ Slug: Can be manually edited, must remain unique
- ✅ Description: Same rules as creation
- ✅ isActive: Can toggle (except system categories)
- ✅ isSystem: Immutable (cannot be changed after creation)

### Delete Validation
- ✅ Check isSystem flag (cannot delete if true)
- ✅ Transaction must succeed atomically
- ✅ All lessons must be reassigned before category is removed

---

## Data Integrity Rules (FR-029, FR-030)

1. **Every lesson MUST have exactly one category** (enforced by required field)
2. **Default category MUST always exist** (seeded on first API call)
3. **Category deletion MUST be atomic** (transaction-based)
4. **No orphaned category references** (foreign key via ObjectId + transaction)
5. **Unique category names** (case-insensitive check at API level)
6. **Article counts MAY be eventually consistent** (updated async or on-demand)

---

## Performance Considerations

### Indexing Strategy
- **Primary lookups**: `_id`, `slug`, `name` (unique indexes)
- **Filtering**: `isActive` + `order` (compound index)
- **Category-based lesson queries**: `Lesson.category` (indexed)

### Caching Strategy (Future Optimization)
- Cache active categories list (TTL: 5 minutes)
- Invalidate cache on category CRUD operations
- Lesson counts can be stale (acceptable trade-off)

### Query Optimization
```javascript
// Efficient: Uses index
Lesson.find({ category: categoryId }).limit(12);

// Efficient: Compound index
Lesson.find({ category: categoryId, level: 'A1' });

// Avoid: N+1 query problem
const lessons = await Lesson.find();
for (const lesson of lessons) {
  const cat = await ArticleCategory.findById(lesson.category); // BAD
}

// Better: Use populate or aggregation
const lessons = await Lesson.find().populate('category');
```

---

## Summary

| Entity | Purpose | Key Fields | Relationships |
|--------|---------|------------|---------------|
| ArticleCategory | Category taxonomy | name, slug, isSystem | 1:N → Lesson |
| Lesson (modified) | Content entity | +category (ObjectId) | N:1 → ArticleCategory |

**Data Integrity**: Enforced via MongoDB transactions, required fields, unique constraints, and application-level validation.

**Migration Required**: Yes - assign default category to existing lessons before deploying.

**Next Steps**: Define API contracts (Phase 1 continues with contracts/).
