import mongoose from 'mongoose';

const RankHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: { 
    type: Date, 
    required: true 
  },
  pointsRank: { 
    type: Number 
  },
  streakRank: { 
    type: Number 
  },
  timeRank: { 
    type: Number 
  },
  points: { 
    type: Number 
  },
  streak: { 
    type: Number 
  },
  timeSpent: { 
    type: Number 
  }
}, { timestamps: true });

RankHistorySchema.index({ userId: 1, date: -1 });
RankHistorySchema.index({ date: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL

export default mongoose.models.RankHistory || mongoose.model('RankHistory', RankHistorySchema);
