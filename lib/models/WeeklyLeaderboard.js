import mongoose from 'mongoose';

const WeeklyLeaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: { 
    type: Number, 
    required: true 
  },
  week: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 53 
  },
  weeklyPoints: { 
    type: Number, 
    default: 0 
  },
  startingPoints: { 
    type: Number, 
    default: 0 
  },
  timeSpent: { 
    type: Number, 
    default: 0 
  },
  lessonsCompleted: { 
    type: Number, 
    default: 0 
  },
  sentencesCompleted: { 
    type: Number, 
    default: 0 
  },
  maxStreakThisWeek: { 
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
}, { timestamps: true });

WeeklyLeaderboardSchema.index({ year: 1, week: 1, weeklyPoints: -1 });
WeeklyLeaderboardSchema.index({ userId: 1, year: 1, week: 1 }, { unique: true });

export default mongoose.models.WeeklyLeaderboard || mongoose.model('WeeklyLeaderboard', WeeklyLeaderboardSchema);
