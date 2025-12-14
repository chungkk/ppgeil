#!/usr/bin/env node
/**
 * Migration Script: Assign Default Category to Existing Lessons
 * 
 * This script:
 * 1. Creates the default "Chưa phân loại" (Uncategorized) category if it doesn't exist
 * 2. Assigns this default category to all existing lessons that don't have a category
 * 
 * Run this BEFORE deploying the new code that makes category field required.
 * 
 * Usage: node scripts/migrate-lessons-categories.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

// Import models (will be created in Phase 2)
// Note: Temporarily using dynamic imports to avoid errors if models don't exist yet
let Lesson, ArticleCategory;

async function loadModels() {
  try {
    const lessonModule = await import('../lib/models/Lesson.js');
    const categoryModule = await import('../lib/models/ArticleCategory.js');
    Lesson = lessonModule.Lesson;
    ArticleCategory = categoryModule.ArticleCategory;
    return true;
  } catch (error) {
    console.error('❌ Error loading models:', error.message);
    console.error('Make sure ArticleCategory and Lesson models exist before running this migration.');
    return false;
  }
}

async function migrate() {
  let connection;
  
  try {
    // Check environment variable
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('🔄 Starting migration...');
    console.log('📦 Connecting to MongoDB...');
    
    // Connect to MongoDB
    connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Load models
    const modelsLoaded = await loadModels();
    if (!modelsLoaded) {
      process.exit(1);
    }

    // Step 1: Create or find default category
    console.log('\n📋 Step 1: Checking for default category...');
    let defaultCategory = await ArticleCategory.findOne({ 
      isSystem: true,
      slug: 'chua-phan-loai'
    });
    
    if (!defaultCategory) {
      console.log('Creating default "Chưa phân loại" category...');
      defaultCategory = await ArticleCategory.create({
        name: 'Chưa phân loại',
        slug: 'chua-phan-loai',
        description: 'Danh mục mặc định cho bài viết chưa được phân loại',
        isSystem: true,
        isActive: true,
        order: 0
      });
      console.log('✅ Created default category with ID:', defaultCategory._id);
    } else {
      console.log('✅ Default category already exists with ID:', defaultCategory._id);
    }

    // Step 2: Count lessons without category
    console.log('\n📊 Step 2: Analyzing lessons...');
    const totalLessons = await Lesson.countDocuments({});
    const lessonsWithoutCategory = await Lesson.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: null }
      ]
    });
    const lessonsWithCategory = totalLessons - lessonsWithoutCategory;
    
    console.log(`Total lessons: ${totalLessons}`);
    console.log(`Lessons with category: ${lessonsWithCategory}`);
    console.log(`Lessons without category: ${lessonsWithoutCategory}`);

    // Step 3: Assign default category to lessons without one
    if (lessonsWithoutCategory > 0) {
      console.log('\n🔧 Step 3: Assigning default category to lessons...');
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
      
      // Verify update
      const remainingWithoutCategory = await Lesson.countDocuments({
        $or: [
          { category: { $exists: false } },
          { category: null }
        ]
      });
      
      if (remainingWithoutCategory === 0) {
        console.log('✅ All lessons now have a category!');
      } else {
        console.warn(`⚠️  Warning: ${remainingWithoutCategory} lessons still without category`);
      }
    } else {
      console.log('\n✅ Step 3: All lessons already have categories - no migration needed');
    }

    // Step 4: Final verification
    console.log('\n🔍 Step 4: Final verification...');
    const finalCount = await Lesson.countDocuments({ category: defaultCategory._id });
    console.log(`Total lessons with default category: ${finalCount}`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`
Summary:
- Default category ID: ${defaultCategory._id}
- Default category slug: ${defaultCategory.slug}
- Lessons migrated: ${lessonsWithoutCategory}
- Total lessons with categories: ${totalLessons}

Next steps:
1. Verify in MongoDB that all lessons have a category field
2. Update Lesson model to set category as required: true
3. Deploy the new code
`);

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Migration failed!');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    if (connection) {
      await mongoose.disconnect();
      console.log('\n📦 Disconnected from MongoDB');
    }
  }
}

// Run migration
migrate();
