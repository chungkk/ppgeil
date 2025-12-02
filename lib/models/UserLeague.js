import mongoose from 'mongoose';

const UserLeagueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  league: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
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
  rankInLeague: { 
    type: Number 
  },
  totalInLeague: { 
    type: Number 
  },
  promoted: { 
    type: Boolean, 
    default: false 
  },
  demoted: { 
    type: Boolean, 
    default: false 
  },
  previousLeague: { 
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond', null]
  },
  points: { 
    type: Number 
  }
}, { timestamps: true });

UserLeagueSchema.index({ userId: 1, year: 1, week: 1 }, { unique: true });
UserLeagueSchema.index({ year: 1, week: 1, league: 1, rankInLeague: 1 });

export default mongoose.models.UserLeague || mongoose.model('UserLeague', UserLeagueSchema);
