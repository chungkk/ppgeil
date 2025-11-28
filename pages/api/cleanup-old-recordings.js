import connectDB from '../../lib/mongodb';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

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

/**
 * API endpoint to cleanup old recording progress (older than 30 days)
 * This can be called manually or set up as a cron job
 */
async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Optional: Add API key authentication for security
  const apiKey = req.headers['x-api-key'];
  if (process.env.CLEANUP_API_KEY && apiKey !== process.env.CLEANUP_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await connectDB();

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find old progress to delete their audio files first
    const oldProgressList = await ShadowingSentenceProgress.find({
      lastAttemptDate: { $lt: thirtyDaysAgo }
    });

    let deletedFilesCount = 0;

    // Delete audio files for old progress
    for (const progress of oldProgressList) {
      if (progress.audioFilePath) {
        const filePath = path.join(process.cwd(), 'public', progress.audioFilePath);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            deletedFilesCount++;
            console.log('Deleted old audio file:', filePath);
          } catch (err) {
            console.error('Error deleting old audio file:', err);
          }
        }
      }
    }

    // Delete all progress older than 30 days
    const result = await ShadowingSentenceProgress.deleteMany({
      lastAttemptDate: { $lt: thirtyDaysAgo }
    });

    console.log(`Cleanup completed: ${result.deletedCount} old recording progress deleted, ${deletedFilesCount} audio files deleted`);

    return res.status(200).json({
      message: 'Dọn dẹp thành công',
      deletedCount: result.deletedCount,
      deletedFilesCount,
      cutoffDate: thirtyDaysAgo
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      message: 'Lỗi khi dọn dẹp dữ liệu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default handler;
