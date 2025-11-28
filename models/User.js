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
     enum: ['vi', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'] // Add more as needed
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
   }
});

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