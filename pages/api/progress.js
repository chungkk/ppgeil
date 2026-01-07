import { optionalAuth } from '../../lib/authMiddleware';
import { UserProgress } from '../../lib/models/UserProgress';
import User from '../../models/User';
import connectDB from '../../lib/mongodb';

// Helper to update user streak
async function updateUserStreak(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const user = await User.findById(userId);
  if (!user) return;
  
  const lastActive = user.streak?.lastActiveDate ? new Date(user.streak.lastActiveDate) : null;
  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
  }
  
  // If already active today, no update needed
  if (lastActive && lastActive.getTime() === today.getTime()) {
    return;
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  let newStreak = 1;
  if (lastActive && lastActive.getTime() === yesterday.getTime()) {
    // Consecutive day - increment streak
    newStreak = (user.streak?.currentStreak || 0) + 1;
  }
  // If more than 1 day gap, streak resets to 1
  
  const maxStreak = Math.max(newStreak, user.streak?.maxStreak || 0);
  
  // Update weeklyProgress (index 0 = Monday, 6 = Sunday)
  const dayOfWeek = (today.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  const weeklyProgress = user.streak?.weeklyProgress || [false, false, false, false, false, false, false];
  
  // Reset weekly progress if it's a new week (Monday)
  if (dayOfWeek === 0 && lastActive && lastActive < today) {
    weeklyProgress.fill(false);
  }
  weeklyProgress[dayOfWeek] = true;
  
  await User.findByIdAndUpdate(userId, {
    'streak.currentStreak': newStreak,
    'streak.maxStreak': maxStreak,
    'streak.lastActiveDate': today,
    'streak.weeklyProgress': weeklyProgress
  });
}

async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'POST') {
    try {
      // Guest users cannot save progress
      if (!req.user) {
        return res.status(401).json({
          message: 'Vui lòng đăng nhập để lưu tiến trình',
          requiresAuth: true
        });
      }

      const { lessonId, mode, progress, studyTime } = req.body;

      // Validate required fields
      if (!lessonId || !mode) {
        return res.status(400).json({
          message: 'lessonId and mode are required'
        });
      }

      // Find existing progress or create new one
      let userProgress = await UserProgress.findOne({
        userId: req.user._id,
        lessonId,
        mode
      });

      if (userProgress) {
        // Update existing progress
        if (progress !== undefined) {
          userProgress.progress = progress;
        }
        // Ensure progress is never undefined
        if (!userProgress.progress || typeof userProgress.progress !== 'object') {
          userProgress.progress = {};
        }
        if (studyTime !== undefined) {
          userProgress.studyTime = studyTime;
        }
        await userProgress.save(); // This triggers pre-save middleware

        console.log('POST progress updated:', {
          lessonId,
          mode,
          studyTime: userProgress.studyTime,
          providedStudyTime: studyTime
        });
      } else {
        // Create new progress
        userProgress = new UserProgress({
          userId: req.user._id,
          lessonId,
          mode,
          progress: progress && typeof progress === 'object' ? progress : {},
          studyTime: studyTime || 0
        });
        await userProgress.save(); // This triggers pre-save middleware

        console.log('POST progress created:', {
          lessonId,
          mode,
          studyTime: userProgress.studyTime,
          providedStudyTime: studyTime
        });
      }

      // Update user streak
      await updateUserStreak(req.user._id);

      return res.status(200).json({
        message: 'Lưu tiến trình thành công',
        completionPercent: userProgress.completionPercent,
        studyTime: userProgress.studyTime
      });
    } catch (error) {
      console.error('Save progress error:', error);
      console.error('Error details:', {
        lessonId: req.body.lessonId,
        mode: req.body.mode,
        userId: req.user?._id,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return res.status(400).json({
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  if (req.method === 'GET') {
    try {
      // Guest users get empty progress
      if (!req.user) {
        return res.status(200).json({
          progress: {},
          studyTime: 0,
          isGuest: true
        });
      }

      const { lessonId, mode } = req.query;

      if (lessonId && mode) {
        const progressDoc = await UserProgress.findOne({ userId: req.user._id, lessonId, mode });
        const responseData = progressDoc ? {
          progress: progressDoc.progress || {},
          studyTime: progressDoc.studyTime || 0
        } : { progress: {}, studyTime: 0 };

        console.log('GET progress response:', {
          lessonId,
          mode,
          hasDoc: !!progressDoc,
          studyTime: responseData.studyTime
        });

        return res.status(200).json(responseData);
      }

      const allProgress = await UserProgress.find({ userId: req.user._id });
      return res.status(200).json(allProgress);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default optionalAuth(handler);
