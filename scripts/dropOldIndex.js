// Script to drop old lessonId_1 index
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function dropOldIndex() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('lessons');

    // Get all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    // Drop lessonId_1 index if exists
    try {
      await collection.dropIndex('lessonId_1');
      console.log('\n✅ Dropped index: lessonId_1');
    } catch (err) {
      if (err.code === 27) {
        console.log('\n⚠️  Index lessonId_1 không tồn tại (đã được xóa trước đó)');
      } else {
        throw err;
      }
    }

    // Show remaining indexes
    console.log('\n📋 Remaining indexes:');
    const remainingIndexes = await collection.indexes();
    remainingIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    console.log('\n🎉 Done! Bạn có thể tạo bài học mới bây giờ.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

dropOldIndex();
