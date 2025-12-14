# Migration Guide: Article Category System

**Feature**: 001-article-categories  
**Created**: 2025-12-14

## Overview

This document provides migration instructions and MongoDB version requirements for the article category system.

---

## MongoDB Version Requirements

### Transaction Support

The article category deletion feature uses **MongoDB transactions** to ensure atomic operations when:
1. Deleting a category
2. Reassigning all affected articles to the default category

**Minimum MongoDB Version**: **4.0+**

### How to Check Your MongoDB Version

Run this command in your MongoDB shell or application:

```javascript
db.version()
```

Or via mongosh:

```bash
mongosh --eval "db.version()"
```

Or in Node.js:

```javascript
const mongoose = require('mongoose');
await mongoose.connect(process.env.MONGODB_URI);
const adminDb = mongoose.connection.db.admin();
const serverStatus = await adminDb.serverStatus();
console.log('MongoDB Version:', serverStatus.version);
```

### Version Compatibility

| MongoDB Version | Transaction Support | Status |
|----------------|---------------------|--------|
| < 4.0 | ❌ No | Not supported - fallback required |
| 4.0 - 4.2 | ✅ Yes (replica set only) | Supported |
| 4.4+ | ✅ Yes (replica set + sharded) | Fully supported |
| 5.0+ | ✅ Yes | Recommended |
| 6.0+ | ✅ Yes | Recommended |

### Deployment Topology Requirements

**Transactions require one of the following**:
- MongoDB Replica Set (3+ nodes recommended)
- MongoDB Sharded Cluster
- MongoDB Atlas (automatically uses replica sets)

**Not supported**:
- Standalone MongoDB server

### If Transactions Are Not Available

If your MongoDB deployment doesn't support transactions, the DELETE endpoint will need a fallback implementation:

```javascript
// Fallback implementation (without transactions)
async function handleDelete(req, res) {
  try {
    const { id } = req.query;
    
    const category = await ArticleCategory.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    if (category.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system category' });
    }
    
    // Get default category
    const defaultCategory = await ArticleCategory.findOne({ isSystem: true });
    
    // 1. Reassign articles first
    const reassignResult = await Lesson.updateMany(
      { category: id },
      { $set: { category: defaultCategory._id } }
    );
    
    // 2. Then delete category
    await ArticleCategory.findByIdAndDelete(id);
    
    return res.status(200).json({
      message: `Category deleted, ${reassignResult.modifiedCount} articles reassigned`,
      reassignedCount: reassignResult.modifiedCount
    });
    
  } catch (error) {
    console.error('DELETE error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**⚠️ Risk**: Without transactions, if step 2 (delete) fails, articles are reassigned but category remains. This is generally acceptable but not ideal.

---

## Migration Steps

### Prerequisites

- [ ] MongoDB version 4.0+ (or fallback implementation)
- [ ] Database backup completed
- [ ] Admin access to MongoDB
- [ ] Node.js environment configured

### Step 1: Verify Database Connection

```bash
node -e "require('dotenv').config({path:'.env.local'}); console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing')"
```

### Step 2: Check MongoDB Version

```bash
# Via application
node scripts/check-mongodb-version.js

# Or manually via mongosh
mongosh "YOUR_MONGODB_URI" --eval "db.version()"
```

Expected output:
```
MongoDB Version: 6.0.x (or 4.0+)
Transactions Supported: Yes
Topology: Replica Set
```

### Step 3: Backup Database

**Important**: Always backup before migration!

```bash
# MongoDB Atlas: Use automated backups or download snapshot
# Self-hosted: Use mongodump
mongodump --uri="YOUR_MONGODB_URI" --out=./backup/before-category-migration-2025-12-14
```

### Step 4: Run Migration Script

```bash
node scripts/migrate-lessons-categories.js
```

**Expected output**:
```
🔄 Starting migration...
📦 Connecting to MongoDB...
✅ Connected to MongoDB

📋 Step 1: Checking for default category...
✅ Created default category with ID: 6579abc...

📊 Step 2: Analyzing lessons...
Total lessons: 150
Lessons with category: 0
Lessons without category: 150

🔧 Step 3: Assigning default category to lessons...
✅ Updated 150 lessons

🔍 Step 4: Final verification...
Total lessons with default category: 150

============================================================
✅ Migration completed successfully!
============================================================

Summary:
- Default category ID: 6579abc...
- Lessons migrated: 150
- Total lessons with categories: 150
```

### Step 5: Verify Migration

**Via MongoDB shell**:

```javascript
// Check default category exists
db.articlecategories.findOne({ isSystem: true })

// Check all lessons have categories
db.lessons.countDocuments({ category: { $exists: false } })
// Should return: 0

// Check lessons with default category
db.lessons.countDocuments({ category: ObjectId("YOUR_DEFAULT_CATEGORY_ID") })
// Should return: number of previously uncategorized lessons
```

**Via application**:

```bash
node -e "
import('./lib/mongodb.js').then(async (m) => {
  await m.default();
  const { Lesson } = await import('./lib/models/Lesson.js');
  const { ArticleCategory } = await import('./lib/models/ArticleCategory.js');
  
  const defaultCat = await ArticleCategory.findOne({ isSystem: true });
  const lessonsWithDefault = await Lesson.countDocuments({ category: defaultCat._id });
  const totalLessons = await Lesson.countDocuments({});
  
  console.log('Default category:', defaultCat.name);
  console.log('Lessons with default:', lessonsWithDefault);
  console.log('Total lessons:', totalLessons);
  
  process.exit(0);
});
"
```

### Step 6: Update Lesson Model

After successful migration, update the Lesson model to make category required:

**File**: `lib/models/Lesson.js`

```javascript
category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'ArticleCategory',
  required: true,  // ← Change from false to true
  index: true
}
```

### Step 7: Deploy New Code

- [ ] Commit migration script
- [ ] Commit model changes
- [ ] Deploy to staging
- [ ] Test category operations
- [ ] Deploy to production

---

## Rollback Procedure

If something goes wrong, follow these steps:

### 1. Restore Database Backup

```bash
mongorestore --uri="YOUR_MONGODB_URI" --drop ./backup/before-category-migration-2025-12-14
```

### 2. Revert Code Changes

```bash
git revert HEAD  # If already committed
# Or
git checkout main -- lib/models/Lesson.js  # Revert specific file
```

### 3. Remove Category Field (If Needed)

```javascript
// Remove category field from all lessons
db.lessons.updateMany({}, { $unset: { category: "" } })
```

---

## Troubleshooting

### Error: "Transaction numbers are only allowed on a replica set member"

**Cause**: MongoDB standalone server doesn't support transactions

**Solutions**:
1. Upgrade to replica set (recommended for production)
2. Use fallback implementation without transactions (see above)
3. For development: Use MongoDB Atlas free tier (includes replica set)

### Error: "MONGODB_URI not found"

**Cause**: Environment variable not set

**Solution**:
```bash
# Check .env.local exists
ls -la .env.local

# Verify content
cat .env.local | grep MONGODB_URI
```

### Error: "Cannot read property '_id' of null" 

**Cause**: Default category not created

**Solution**:
```bash
# Re-run migration script
node scripts/migrate-lessons-categories.js

# Or manually create default category
node -e "
import('./lib/mongodb.js').then(async (m) => {
  await m.default();
  const { ArticleCategory } = await import('./lib/models/ArticleCategory.js');
  
  const cat = await ArticleCategory.create({
    name: 'Chưa phân loại',
    slug: 'chua-phan-loai',
    description: 'Danh mục mặc định',
    isSystem: true,
    isActive: true
  });
  
  console.log('Created:', cat);
  process.exit(0);
});
"
```

### Migration Runs But No Lessons Updated

**Possible causes**:
1. Lessons already have categories
2. Lesson model doesn't have category field yet (run Phase 2 first)
3. Wrong database connection

**Debug**:
```javascript
// Check lesson schema
db.lessons.findOne()  // Look for category field

// Check migration was needed
db.lessons.countDocuments({ category: { $exists: false } })
```

---

## Post-Migration Checklist

- [ ] All lessons have a category (no nulls)
- [ ] Default "Chưa phân loại" category exists with isSystem: true
- [ ] Lesson model has required: true for category field
- [ ] Admin can create/edit/delete categories
- [ ] Users can filter by categories
- [ ] Deleting category reassigns articles correctly
- [ ] Cannot delete system category
- [ ] Vietnamese slugs work correctly

---

## MongoDB Atlas Specifics

If using **MongoDB Atlas**:

✅ **Advantages**:
- Automatic replica set (transactions supported out of the box)
- No additional configuration needed
- Automatic backups with point-in-time recovery
- Version 4.4+ by default

**Connection String Example**:
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Verify Atlas Topology**:
```javascript
const mongoose = require('mongoose');
await mongoose.connect(process.env.MONGODB_URI);
const topology = mongoose.connection.db.serverConfig;
console.log('Topology Type:', topology.s.description.type);
// Expected: "ReplicaSetWithPrimary"
```

---

## Support

For issues or questions:
1. Check this MIGRATION.md
2. Review quickstart.md
3. Check MongoDB server logs
4. Verify environment variables
5. Test with a minimal example

**MongoDB Version Check Script**: See `scripts/check-mongodb-version.js` (to be created if needed)
