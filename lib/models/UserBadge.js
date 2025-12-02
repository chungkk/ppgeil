import mongoose from 'mongoose';

const UserBadgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badgeType: {
    type: String,
    enum: ['top_monthly', 'top_alltime'],
    required: true
  },
  year: { 
    type: Number 
  },
  month: { 
    type: Number,
    min: 1,
    max: 12
  },
  rank: { 
    type: Number, 
    required: true,
    min: 1,
    max: 10
  },
  points: { 
    type: Number 
  },
  awardedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

UserBadgeSchema.index({ userId: 1 });
UserBadgeSchema.index({ badgeType: 1, year: 1, month: 1 });
UserBadgeSchema.index({ userId: 1, badgeType: 1, year: 1, month: 1 }, { unique: true, sparse: true });

export default mongoose.models.UserBadge || mongoose.model('UserBadge', UserBadgeSchema);
