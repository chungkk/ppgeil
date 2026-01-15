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
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArticleCategory',
    required: true,   // ✅ Set to true after successful migration (T009)
    index: true       // For efficient category filtering
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
    required: false // Optional thumbnail for audio files (YouTube will use video thumbnail)
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isFreeLesson: {
    type: Boolean,
    default: false
  }
});

// Compound indexes for category filtering (T006)
LessonSchema.index({ category: 1, createdAt: -1 });  // Filter by category, sort by date
LessonSchema.index({ level: 1, category: 1 });        // Combined level + category filter

// Ensure toJSON includes id field
LessonSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Keep both _id and id fields
    return ret;
  }
});

export const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
