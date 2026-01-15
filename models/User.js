import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Vui lòng nhập email'],
    unique: true,
    lowercase: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser;
    },
    minlength: 6
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  },
   role: {
     type: String,
     enum: ['member', 'admin'],
     default: 'member'
   },
   nativeLanguage: {
     type: String,
     default: 'vi',
     enum: ['vi', 'en']
   },
   level: {
     type: String,
     default: 'beginner',
     enum: ['beginner', 'experienced', 'all']
   },
   preferredDifficultyLevel: {
     type: String,
     default: 'b1',
     enum: ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'c1c2']
   },
   points: {
     type: Number,
     default: 0,
     min: 0
   },
   monthlyPoints: {
     type: Number,
     default: 0,
     min: 0
   },
   lastMonthlyReset: {
     type: Date,
     default: null
   },
   lastLoginDate: {
     type: Date,
     default: null
   },
   createdAt: {
     type: Date,
     default: Date.now
   },
   // Smart Leaderboard fields
   streak: {
     currentStreak: { type: Number, default: 0 },
     maxStreak: { type: Number, default: 0 },
     lastActiveDate: { type: Date, default: null },
     weeklyProgress: { type: [Boolean], default: [false, false, false, false, false, false, false] }
   },
   // Answer Streak - consecutive correct answers
   answerStreak: {
     current: { type: Number, default: 0 },
     max: { type: Number, default: 0 },
     lastAnswerTime: { type: Date, default: null }
   },
   totalTimeSpent: {
     type: Number,
     default: 0,
     min: 0
   },
   lessonsCompleted: {
     type: Number,
     default: 0,
     min: 0
   },
   weeklyPoints: {
     type: Number,
     default: 0,
     min: 0
   },
   lastWeeklyReset: {
     type: Date,
     default: null
   },
   currentLeague: {
     type: String,
     enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
     default: 'bronze'
   },
   // Leben in Deutschland
   bundesland: {
     type: String,
     enum: ['bw', 'by', 'be', 'bb', 'hb', 'hh', 'he', 'mv', 'ni', 'nw', 'rp', 'sl', 'sn', 'st', 'sh', 'th', ''],
     default: ''
   },
   lidProgress: {
     completedQuestions: { type: [Number], default: [] },
     testsTaken: { type: Number, default: 0 },
     bestScore: { type: Number, default: 0 },
     lastTestDate: { type: Date, default: null }
   },
   // Vocabulary Learning Progress with Spaced Repetition
   vocabProgress: {
     a1: {
       // Words by mastery level: new -> learning -> mastered
       newWords: { type: [String], default: [] },        // Chưa biết
       learningWords: { type: [String], default: [] },   // Hơi quen (review after 1-3 days)
       masteredWords: { type: [String], default: [] },   // Đã thuộc (review after 7+ days)
       // Spaced repetition data: { word: nextReviewDate }
       reviewSchedule: { type: Map, of: Date, default: {} },
       totalSessions: { type: Number, default: 0 },
       lastSessionDate: { type: Date, default: null }
     },
     a2: {
       newWords: { type: [String], default: [] },
       learningWords: { type: [String], default: [] },
       masteredWords: { type: [String], default: [] },
       reviewSchedule: { type: Map, of: Date, default: {} },
       totalSessions: { type: Number, default: 0 },
       lastSessionDate: { type: Date, default: null }
     },
     b1: {
       newWords: { type: [String], default: [] },
       learningWords: { type: [String], default: [] },
       masteredWords: { type: [String], default: [] },
       reviewSchedule: { type: Map, of: Date, default: {} },
       totalSessions: { type: Number, default: 0 },
       lastSessionDate: { type: Date, default: null }
     }
   },
   // Anki-style SRS Progress - stores card data per deck
   // Structure: { "level_a1": { cards: { "word": cardData }, stats: {} }, "topic_xyz": { ... } }
   srsProgress: {
     type: mongoose.Schema.Types.Mixed,
     default: {}
   },
   // Lesson Unlock System
   unlockedLessons: {
     type: [String],
     default: []
   },
   freeUnlocksRemaining: {
     type: Number,
     default: 2,
     min: 0
   }
});

// Leaderboard indexes for efficient sorting
UserSchema.index({ points: -1, createdAt: 1 });
UserSchema.index({ 'streak.currentStreak': -1, createdAt: 1 });
UserSchema.index({ totalTimeSpent: -1, createdAt: 1 });
UserSchema.index({ lessonsCompleted: -1, createdAt: 1 });
UserSchema.index({ weeklyPoints: -1, createdAt: 1 });
UserSchema.index({ currentLeague: 1, points: -1 });
UserSchema.index({ 'answerStreak.max': -1, createdAt: 1 });

UserSchema.pre('save', async function(next) {
  // Chỉ hash password nếu password tồn tại và được modified
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);