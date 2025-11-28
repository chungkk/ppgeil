import mongoose from 'mongoose';

const MonthlyLeaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  monthlyPoints: {
    type: Number,
    default: 0
  },
  totalTimeSpent: {
    type: Number, // in seconds
    default: 0
  },
  sentencesCompleted: {
    type: Number,
    default: 0
  },
  lessonsCompleted: {
    type: Number,
    default: 0
  },
  streakDays: {
    type: Number,
    default: 0
  },
  maxStreakThisMonth: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
MonthlyLeaderboardSchema.index({ year: 1, month: 1, monthlyPoints: -1 });
MonthlyLeaderboardSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
MonthlyLeaderboardSchema.index({ year: 1, month: 1, rank: 1 });

export default mongoose.models.MonthlyLeaderboard || mongoose.model('MonthlyLeaderboard', MonthlyLeaderboardSchema);
