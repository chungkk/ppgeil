# Quickstart Guide: Article Category System

**Feature**: 001-article-categories  
**For**: Developers implementing the article category system  
**Date**: 2025-12-14

## Overview

This guide provides step-by-step instructions for implementing the article category system. Follow the phases in order to ensure proper integration with existing code.

**Estimated Implementation Time**: 6-8 hours

---

## Prerequisites

- [ ] MongoDB connection working (check `MONGODB_URI` in `.env.local`)
- [ ] MongoDB version 4.0+ (required for transactions) - verify with admin
- [ ] Admin authentication working (JWT tokens)
- [ ] Existing Lesson model and API routes functional

---

## Phase 1: Database Model (2 hours)

### Step 1.1: Create ArticleCategory Model

Create new file: `lib/models/ArticleCategory.js`

```javascript
import mongoose from 'mongoose';

// Copy full schema from specs/001-article-categories/data-model.md
// Key points:
// - Vietnamese slug generation helper
// - isSystem flag for default category protection
// - Validation rules for name, slug, description
// - Static methods: getDefaultCategory(), getActiveCategories()
```

**Test the model**:
```bash
node -e "
import('./lib/models/ArticleCategory.js').then(async ({ ArticleCategory }) => {
  await mongoose.connect(process.env.MONGODB_URI);
  const cat = await ArticleCategory.create({
    name: 'Test',
    slug: 'test',
    isSystem: false
  });
  console.log('Created:', cat);
  await ArticleCategory.deleteOne({ _id: cat._id });
  process.exit(0);
});
"
```

### Step 1.2: Modify Lesson Model

Edit: `lib/models/Lesson.js`

Add category field:
```javascript
category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ArticleCategory',
  required: true,  // Will set to false initially for migration
  index: true
}
```

Add compound indexes:
```javascript
LessonSchema.index({ category: 1, createdAt: -1 });
LessonSchema.index({ level: 1, category: 1 });
```

### Step 1.3: Migration Script

Create: `scripts/migrate-lessons-categories.js`

```javascript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lesson } from '../lib/models/Lesson.js';
import { ArticleCategory } from '../lib/models/ArticleCategory.js';

dotenv.config({ path: '.env.local' });

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create default category if not exists
    let defaultCategory = await ArticleCategory.findOne({ isSystem: true });
    
    if (!defaultCategory) {
      defaultCategory = await ArticleCategory.create({
        name: 'Chưa phân loại',
        slug: 'chua-phan-loai',
        description: 'Danh mục mặc định cho bài viết chưa được phân loại',
        isSystem: true,
        isActive: true,
        order: 0
      });
      console.log('✅ Created default category:', defaultCategory._id);
    } else {
      console.log('✅ Default category exists:', defaultCategory._id);
    }

    // 2. Count lessons without category
    const lessonsWithoutCategory = await Lesson.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: null }
      ]
    });
    
    console.log(`📊 Found ${lessonsWithoutCategory} lessons without category`);

    // 3. Assign default category to all lessons without one
    if (lessonsWithoutCategory > 0) {
      const result = await Lesson.updateMany(
        {
          $or: [
            { category: { $exists: false } },
            { category: null }
          ]
        },
        { $set: { category: defaultCategory._id } }
      );
      console.log(`✅ Updated ${result.modifiedCount} lessons`);
    }

    // 4. Verify all lessons have categories
    const remaining = await Lesson.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: null }
      ]
    });
    
    if (remaining === 0) {
      console.log('✅ All lessons have categories!');
      console.log('✅ Migration complete - you can now set category to required: true');
    } else {
      console.error(`❌ ${remaining} lessons still without category`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
```

**Run migration**:
```bash
node scripts/migrate-lessons-categories.js
```

After successful migration, update Lesson model:
```javascript
category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ArticleCategory',
  required: true,  // NOW set to true
  index: true
}
```

---

## Phase 2: Backend API (2-3 hours)

### Step 2.1: Category API Route

Create: `pages/api/article-categories/index.js`

```javascript
import { verifyToken } from '../../../lib/jwt';
import connectDB from '../../../lib/mongodb';
import { ArticleCategory } from '../../../lib/models/ArticleCategory';
import { Lesson } from '../../../lib/models/Lesson';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await connectDB();
  
  // Ensure default category exists
  await ensureDefaultCategory();

  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  
  // All other methods require admin auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không được phép truy cập' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền' });
  }

  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  
  if (req.method === 'PUT') {
    return handlePut(req, res);
  }
  
  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  }

  return res.status(405).json({ error: 'Phương thức không được phép' });
}

async function handleGet(req, res) {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const filter = activeOnly ? { isActive: true } : {};
    
    const categories = await ArticleCategory.find(filter)
      .sort({ order: 1, name: 1 });
    
    // Get article counts
    const stats = {};
    for (const category of categories) {
      const count = await Lesson.countDocuments({ category: category._id });
      stats[category.slug] = count;
    }
    
    return res.status(200).json({ categories, stats });
  } catch (error) {
    console.error('GET error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePost(req, res) {
  try {
    const { name, slug, description, isActive, order } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên danh mục là bắt buộc' });
    }
    
    // Check duplicate name (case-insensitive)
    const existingByName = await ArticleCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    
    if (existingByName) {
      return res.status(400).json({ error: 'Danh mục với tên này đã tồn tại' });
    }
    
    const category = await ArticleCategory.create({
      name: name.trim(),
      slug: slug || undefined, // Let pre-save hook generate if not provided
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      isSystem: false, // Never allow creating system categories via API
      order: order || 0
    });
    
    return res.status(201).json({
      message: 'Danh mục đã được tạo thành công',
      category
    });
  } catch (error) {
    console.error('POST error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Danh mục với slug này đã tồn tại' });
    }
    return res.status(400).json({ error: error.message });
  }
}

async function handlePut(req, res) {
  try {
    const { id, name, slug, description, isActive, order } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID là bắt buộc' });
    }
    
    const category = await ArticleCategory.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    }
    
    // Update fields
    if (name !== undefined) category.name = name.trim();
    if (slug !== undefined) category.slug = slug.trim();
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;
    if (order !== undefined) category.order = order;
    
    await category.save();
    
    return res.status(200).json({
      message: 'Danh mục đã được cập nhật',
      category
    });
  } catch (error) {
    console.error('PUT error:', error);
    return res.status(400).json({ error: error.message });
  }
}

async function handleDelete(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.query;
    
    if (!id) {
      throw new Error('ID là bắt buộc');
    }
    
    const category = await ArticleCategory.findById(id).session(session);
    
    if (!category) {
      throw new Error('Không tìm thấy danh mục');
    }
    
    if (category.isSystem) {
      throw new Error('Không thể xóa danh mục hệ thống');
    }
    
    // Get default category
    const defaultCategory = await ArticleCategory.findOne({
      isSystem: true
    }).session(session);
    
    if (!defaultCategory) {
      throw new Error('Không tìm thấy danh mục mặc định');
    }
    
    // Reassign all lessons to default category
    const reassignResult = await Lesson.updateMany(
      { category: id },
      { $set: { category: defaultCategory._id } },
      { session }
    );
    
    // Delete the category
    await ArticleCategory.findByIdAndDelete(id).session(session);
    
    await session.commitTransaction();
    
    return res.status(200).json({
      message: `Danh mục đã được xóa, ${reassignResult.modifiedCount} bài viết được chuyển sang 'Chưa phân loại'`,
      reassignedCount: reassignResult.modifiedCount
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('DELETE error:', error);
    
    if (error.message.includes('hệ thống')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
}

async function ensureDefaultCategory() {
  const defaultExists = await ArticleCategory.findOne({ isSystem: true });
  
  if (!defaultExists) {
    await ArticleCategory.create({
      name: 'Chưa phân loại',
      slug: 'chua-phan-loai',
      description: 'Danh mục mặc định cho bài viết chưa được phân loại',
      isSystem: true,
      isActive: true,
      order: 0
    });
    console.log('✅ Created default category');
  }
}
```

### Step 2.2: Update Lessons API

Edit: `pages/api/lessons.js`

Add category filtering to GET handler:

```javascript
// In GET handler, add category filter
const category = req.query.category; // Can be slug or ObjectId
let categoryFilter = {};

if (category) {
  // Check if it's an ObjectId or slug
  if (mongoose.Types.ObjectId.isValid(category)) {
    categoryFilter = { category };
  } else {
    // It's a slug, find category first
    const cat = await ArticleCategory.findOne({ slug: category });
    if (cat) {
      categoryFilter = { category: cat._id };
    } else {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }
  }
}

// Combine with existing filters
const levelFilter = /* existing code */;
const combinedFilter = { ...levelFilter, ...categoryFilter };

// Use combinedFilter in queries
const [lessons, total] = await Promise.all([
  Lesson.find(combinedFilter)
    .populate('category') // Add population
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(),
  Lesson.countDocuments(combinedFilter)
]);
```

---

## Phase 3: Frontend Admin UI (2-3 hours)

### Step 3.1: Category Management Page

Create: `pages/admin/dashboard/article-categories.js`

**Reference existing pattern**: Copy structure from `pages/admin/dashboard/categories.js` (vocabulary categories) and adapt for article categories.

Key changes:
- Use `/api/article-categories` endpoint
- Show isSystem badge for default category
- Disable delete button for system categories
- Show article counts for each category

### Step 3.2: Add to Admin Navigation

Edit: `pages/admin/dashboard/index.js` or navigation component

Add link:
```jsx
<Link href="/admin/dashboard/article-categories">
  🏷️ Quản lý danh mục bài viết
</Link>
```

---

## Phase 4: Frontend User UI (1-2 hours)

### Step 4.1: Category Filter Component

Create: `components/CategoryFilter.jsx`

```jsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CategoryFilter({ currentCategory = null }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/article-categories?activeOnly=true');
      const data = await res.json();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (slug) => {
    if (slug === null) {
      // Show all
      router.push('/');
    } else {
      router.push(`/?category=${slug}`);
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="category-filter">
      <button 
        onClick={() => handleCategoryClick(null)}
        className={!currentCategory ? 'active' : ''}
      >
        📚 Tất cả
      </button>
      
      {categories.map(cat => (
        <button
          key={cat._id}
          onClick={() => handleCategoryClick(cat.slug)}
          className={currentCategory === cat.slug ? 'active' : ''}
        >
          {cat.name} ({cat.articleCount || 0})
        </button>
      ))}
    </div>
  );
}
```

### Step 4.2: Integrate Filter into Lessons Page

Edit: `pages/index.js`

```jsx
import CategoryFilter from '../components/CategoryFilter';

export default function Home() {
  const router = useRouter();
  const { category } = router.query;
  
  // Pass category to lesson fetching logic
  const fetchLessons = async () => {
    const url = category 
      ? `/api/lessons?category=${category}`
      : '/api/lessons';
    // ... existing fetch logic
  };

  return (
    <div>
      <CategoryFilter currentCategory={category} />
      {/* ... existing lesson list */}
    </div>
  );
}
```

---

## Testing Checklist

### Unit Tests (If implementing)

- [ ] ArticleCategory model validation
- [ ] Slug generation for Vietnamese characters
- [ ] Default category protection

### Integration Tests

- [ ] Create category via API
- [ ] Update category via API
- [ ] Delete category (with article reassignment)
- [ ] Attempt to delete system category (should fail)
- [ ] Filter lessons by category
- [ ] Assign category to lesson

### Manual Testing

**Admin Flow**:
1. [ ] Log in as admin
2. [ ] Navigate to category management
3. [ ] Create new category "Ngữ pháp A1"
4. [ ] Verify slug auto-generated: "ngu-phap-a1"
5. [ ] Edit category name
6. [ ] Try to delete default "Chưa phân loại" (should fail)
7. [ ] Create test category with articles
8. [ ] Delete test category
9. [ ] Verify articles moved to default category

**User Flow**:
1. [ ] Visit homepage
2. [ ] See category filter with article counts
3. [ ] Click on a category
4. [ ] Verify URL contains `?category=slug`
5. [ ] Verify only articles from that category show
6. [ ] Click "Tất cả" to see all articles
7. [ ] Bookmark category URL and verify it works

---

## Troubleshooting

### "Cannot read property '_id' of null" when creating lesson
**Cause**: No default category exists  
**Fix**: Run migration script or manually create default category

### Transaction error: "Transaction numbers are only allowed on a replica set member or mongos"
**Cause**: MongoDB standalone instance doesn't support transactions  
**Fix**: Either upgrade to replica set, or modify DELETE handler to use fallback non-transactional approach

### Duplicate key error on slug
**Cause**: Slug already exists  
**Fix**: Manually specify different slug or change category name

### Categories not showing in filter
**Cause**: Categories marked as isActive: false  
**Fix**: Edit categories and set isActive: true

---

## Performance Optimization (Optional)

### Cache Category List
```javascript
// Add to API route
res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
```

### Optimize Article Counts
Use aggregation instead of multiple countDocuments calls:

```javascript
const stats = await Lesson.aggregate([
  { $group: { _id: '$category', count: { $sum: 1 } } }
]);
```

---

## Deployment Checklist

- [ ] Run migration script on production database
- [ ] Verify MongoDB version supports transactions (4.0+)
- [ ] Test category creation/deletion on production
- [ ] Verify default category exists
- [ ] Check all lessons have categories
- [ ] Monitor for orphaned category references
- [ ] Set up admin access for category management

---

## Next Steps

After completing this implementation:

1. **Documentation**: Update main README with category feature
2. **Analytics**: Track category usage metrics
3. **SEO**: Add category pages with proper meta tags
4. **Enhancement**: Consider category images/icons
5. **Enhancement**: Add category sorting/drag-and-drop reordering

---

## Support

**Documentation References**:
- [Data Model](./data-model.md) - Full schema definitions
- [API Contracts](./contracts/article-categories-api.yaml) - Complete API specification
- [Research](./research.md) - Technical decisions and alternatives

**Questions?** Check the spec.md file for requirements clarification.
