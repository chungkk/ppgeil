import mongoose from 'mongoose';

const UserProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lessonId: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['shadowing', 'dictation']
  },
  progress: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  completionPercent: {
    type: Number,
    default: 0
  },
  studyTime: {
    type: Number,
    default: 0,
    description: 'Total study time in seconds'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate completion percentage
UserProgressSchema.pre('save', function(next) {
  const progress = this.progress;

  let completionPercent = 0;
  if (progress.totalWords && progress.correctWords !== undefined) {
    // For dictation mode - based on correct words
    completionPercent = Math.round((progress.correctWords / progress.totalWords) * 100);
  } else if (progress.totalSentences !== undefined && progress.totalSentences > 0) {
    // For shadowing mode - based on sentence progress
    // Use currentSentenceIndex + 1 (since index 0 is first sentence)
    const completedCount = (progress.currentSentenceIndex !== undefined) 
      ? Math.min(progress.currentSentenceIndex + 1, progress.totalSentences)
      : 0;
    completionPercent = Math.round((completedCount / progress.totalSentences) * 100);
  }

  this.completionPercent = completionPercent;
  this.updatedAt = new Date();
  next();
});

export const UserProgress = mongoose.models.UserProgress || mongoose.model('UserProgress', UserProgressSchema);
