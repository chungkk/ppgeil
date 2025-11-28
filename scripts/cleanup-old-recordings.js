const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Schema for sentence-level progress
const ShadowingSentenceProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lessonId: {
    type: String,
    required: true
  },
  sentenceIndex: {
    type: Number,
    required: true
  },
  accuracyPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  attempts: {
    type: Number,
    default: 1
  },
  bestScore: {
    type: Number,
    required: true
  },
  audioFilePath: {
    type: String,
    default: null
  },
  lastAttemptDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ShadowingSentenceProgressSchema.index({ userId: 1, lessonId: 1, sentenceIndex: 1 }, { unique: true });

const ShadowingSentenceProgress = mongoose.models.ShadowingSentenceProgress || 
  mongoose.model('ShadowingSentenceProgress', ShadowingSentenceProgressSchema);

async function cleanupOldRecordings() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB successfully');

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`Deleting recording progress older than: ${thirtyDaysAgo.toISOString()}`);

    // Find old progress to delete their audio files first
    const oldProgressList = await ShadowingSentenceProgress.find({
      lastAttemptDate: { $lt: thirtyDaysAgo }
    });

    console.log(`Found ${oldProgressList.length} old progress entries to delete`);

    let deletedFilesCount = 0;

    // Delete audio files for old progress
    for (const progress of oldProgressList) {
      if (progress.audioFilePath) {
        const filePath = path.join(process.cwd(), 'public', progress.audioFilePath);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            deletedFilesCount++;
            console.log(`  ✓ Deleted audio: ${progress.audioFilePath}`);
          } catch (err) {
            console.error(`  ✗ Error deleting audio file ${filePath}:`, err.message);
          }
        }
      }
    }

    // Delete all progress older than 30 days
    const result = await ShadowingSentenceProgress.deleteMany({
      lastAttemptDate: { $lt: thirtyDaysAgo }
    });

    console.log(`\n✅ Cleanup completed successfully!`);
    console.log(`📊 Deleted ${result.deletedCount} old recording progress entries`);
    console.log(`🗑️ Deleted ${deletedFilesCount} audio files`);
    console.log(`🗓️ Cutoff date: ${thirtyDaysAgo.toISOString()}`);

    // Get current stats
    const totalProgress = await ShadowingSentenceProgress.countDocuments();
    console.log(`📈 Remaining progress entries: ${totalProgress}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the cleanup
cleanupOldRecordings();
