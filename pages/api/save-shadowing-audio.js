import { optionalAuth } from '../../lib/authMiddleware';
import connectDB from '../../lib/mongodb';
import mongoose from 'mongoose';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Schema for sentence-level progress with audio file path
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

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectDB();

  try {
    // Guest users cannot save audio
    if (!req.user) {
      return res.status(401).json({
        message: 'Vui lòng đăng nhập để lưu ghi âm',
        requiresAuth: true
      });
    }

    // Parse form data with audio file
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max for audio
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    const audioFile = files.audio?.[0];
    const lessonId = fields.lessonId?.[0];
    const sentenceIndex = parseInt(fields.sentenceIndex?.[0]);

    // Validate required fields
    if (!audioFile || !lessonId || sentenceIndex === undefined) {
      return res.status(400).json({
        message: 'Audio file, lessonId, and sentenceIndex are required'
      });
    }

    // Create directory for audio recordings if not exists
    const audioDir = path.join(process.cwd(), 'public', 'recordings', req.user._id.toString(), lessonId);
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Find existing progress to check for old audio file
    const existingProgress = await ShadowingSentenceProgress.findOne({
      userId: req.user._id,
      lessonId,
      sentenceIndex
    });

    // Delete old audio file if exists
    if (existingProgress && existingProgress.audioFilePath) {
      const oldFilePath = path.join(process.cwd(), 'public', existingProgress.audioFilePath);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log('Deleted old audio file:', oldFilePath);
        } catch (err) {
          console.error('Error deleting old audio file:', err);
        }
      }
    }

    // Generate unique filename for new audio
    const timestamp = Date.now();
    const ext = path.extname(audioFile.originalFilename || 'audio.webm');
    const fileName = `sentence_${sentenceIndex}_${timestamp}${ext}`;
    const targetPath = path.join(audioDir, fileName);

    // Move uploaded file to target directory
    fs.copyFileSync(audioFile.filepath, targetPath);
    fs.unlinkSync(audioFile.filepath); // Clean up temp file

    // Generate relative path for database storage
    const relativeAudioPath = `/recordings/${req.user._id.toString()}/${lessonId}/${fileName}`;

    // Update progress with new audio file path
    const accuracyPercent = parseFloat(fields.accuracyPercent?.[0]) || 0;
    const score = parseFloat(fields.score?.[0]) || 0;

    if (existingProgress) {
      existingProgress.attempts += 1;
      existingProgress.accuracyPercent = accuracyPercent;
      if (score > existingProgress.bestScore) {
        existingProgress.bestScore = score;
      }
      existingProgress.audioFilePath = relativeAudioPath;
      existingProgress.lastAttemptDate = new Date();
      await existingProgress.save();
    } else {
      const newProgress = new ShadowingSentenceProgress({
        userId: req.user._id,
        lessonId,
        sentenceIndex,
        accuracyPercent,
        bestScore: score,
        attempts: 1,
        audioFilePath: relativeAudioPath
      });
      await newProgress.save();
    }

    return res.status(200).json({
      message: 'Lưu ghi âm thành công',
      audioUrl: relativeAudioPath
    });
  } catch (error) {
    console.error('Save audio error:', error);
    return res.status(500).json({
      message: 'Lỗi khi lưu ghi âm',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default optionalAuth(handler);
