import mongoose from 'mongoose';

const VocabularySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  word: {
    type: String,
    required: true,
    trim: true
  },
  translation: {
    type: String,
    required: true,
    trim: true
  },
  context: {
    type: String,
    default: ''
  },
  example: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  lessonId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['new', 'learning', 'mastered'],
    default: 'new'
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  lastReviewAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
VocabularySchema.index({ userId: 1, word: 1 }, { unique: true });
VocabularySchema.index({ userId: 1, lessonId: 1 });
VocabularySchema.index({ userId: 1, status: 1 });

export default mongoose.models.Vocabulary || mongoose.model('Vocabulary', VocabularySchema);
