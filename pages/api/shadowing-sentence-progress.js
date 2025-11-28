import { optionalAuth } from '../../lib/authMiddleware';
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

// Compound index for efficient queries
ShadowingSentenceProgressSchema.index({ userId: 1, lessonId: 1, sentenceIndex: 1 }, { unique: true });

const ShadowingSentenceProgress = mongoose.models.ShadowingSentenceProgress || 
  mongoose.model('ShadowingSentenceProgress', ShadowingSentenceProgressSchema);

async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'POST') {
    try {
      // Guest users cannot save progress
      if (!req.user) {
        return res.status(401).json({
          message: 'Vui lòng đăng nhập để lưu tiến trình',
          requiresAuth: true
        });
      }

      const { lessonId, sentenceIndex, accuracyPercent, score } = req.body;

      // Validate required fields
      if (!lessonId || sentenceIndex === undefined || accuracyPercent === undefined) {
        return res.status(400).json({
          message: 'lessonId, sentenceIndex, and accuracyPercent are required'
        });
      }

      // Find existing progress or create new one
      let sentenceProgress = await ShadowingSentenceProgress.findOne({
        userId: req.user._id,
        lessonId,
        sentenceIndex
      });

      if (sentenceProgress) {
        // Update existing progress
        sentenceProgress.attempts += 1;
        sentenceProgress.accuracyPercent = accuracyPercent;
        
        // Update best score if this is better
        if (score > sentenceProgress.bestScore) {
          sentenceProgress.bestScore = score;
        }
        
        sentenceProgress.lastAttemptDate = new Date();
        await sentenceProgress.save();
      } else {
        // Create new progress
        sentenceProgress = new ShadowingSentenceProgress({
          userId: req.user._id,
          lessonId,
          sentenceIndex,
          accuracyPercent,
          bestScore: score || 0,
          attempts: 1
        });
        await sentenceProgress.save();
      }

      return res.status(200).json({
        message: 'Lưu kết quả thành công',
        data: sentenceProgress
      });
    } catch (error) {
      console.error('Save sentence progress error:', error);
      return res.status(400).json({
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  if (req.method === 'GET') {
    try {
      // Guest users get empty progress
      if (!req.user) {
        return res.status(200).json({
          data: []
        });
      }

      const { lessonId } = req.query;

      if (!lessonId) {
        return res.status(400).json({
          message: 'lessonId is required'
        });
      }

      // Auto-cleanup: Delete progress older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Find old progress to delete their audio files first
      const oldProgressList = await ShadowingSentenceProgress.find({
        userId: req.user._id,
        lastAttemptDate: { $lt: thirtyDaysAgo }
      });

      // Delete audio files for old progress
      for (const progress of oldProgressList) {
        if (progress.audioFilePath) {
          const filePath = path.join(process.cwd(), 'public', progress.audioFilePath);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log('Deleted old audio file:', filePath);
            } catch (err) {
              console.error('Error deleting old audio file:', err);
            }
          }
        }
      }
      
      // Delete progress records
      await ShadowingSentenceProgress.deleteMany({
        userId: req.user._id,
        lastAttemptDate: { $lt: thirtyDaysAgo }
      });

      // Get all sentence progress for this lesson
      const sentenceProgressList = await ShadowingSentenceProgress.find({
        userId: req.user._id,
        lessonId
      }).sort({ sentenceIndex: 1 });

      // Convert to a map for easy lookup
      const progressMap = {};
      sentenceProgressList.forEach(item => {
        progressMap[item.sentenceIndex] = {
          accuracyPercent: item.accuracyPercent,
          attempts: item.attempts,
          bestScore: item.bestScore,
          lastAttemptDate: item.lastAttemptDate,
          audioFilePath: item.audioFilePath
        };
      });

      return res.status(200).json({
        data: progressMap
      });
    } catch (error) {
      console.error('Get sentence progress error:', error);
      return res.status(500).json({
        message: 'Lỗi khi tải tiến trình'
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default optionalAuth(handler);
