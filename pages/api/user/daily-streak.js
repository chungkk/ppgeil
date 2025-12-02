import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

// Helper: Get day of week index (0 = Monday, 6 = Sunday)
const getDayIndex = (date) => {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // Convert Sunday=0 to index 6
};

// Helper: Check if two dates are the same day
const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

// Helper: Check if date1 is exactly one day before date2
const isYesterday = (date1, date2) => {
  const yesterday = new Date(date2);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date1, yesterday);
};

// Helper: Get start of week (Monday)
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    await connectDB();

    if (req.method === 'GET') {
      const user = await User.findById(decoded.userId).select('streak');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({
        currentStreak: user.streak?.currentStreak || 0,
        maxStreak: user.streak?.maxStreak || 0,
        lastActiveDate: user.streak?.lastActiveDate,
        weeklyProgress: user.streak?.weeklyProgress || [false, false, false, false, false, false, false]
      });
    }

    if (req.method === 'POST') {
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const now = new Date();
      const lastActive = user.streak?.lastActiveDate ? new Date(user.streak.lastActiveDate) : null;
      
      // Initialize streak if not exists
      if (!user.streak) {
        user.streak = {
          currentStreak: 0,
          maxStreak: 0,
          lastActiveDate: null,
          weeklyProgress: [false, false, false, false, false, false, false]
        };
      }

      // Check if already active today
      if (lastActive && isSameDay(lastActive, now)) {
        return res.status(200).json({
          message: 'Already active today',
          currentStreak: user.streak.currentStreak,
          maxStreak: user.streak.maxStreak,
          weeklyProgress: user.streak.weeklyProgress,
          updated: false
        });
      }

      // Reset weekly progress if new week started
      const currentWeekStart = getWeekStart(now);
      const lastWeekStart = lastActive ? getWeekStart(lastActive) : null;
      
      if (!lastWeekStart || currentWeekStart.getTime() !== lastWeekStart.getTime()) {
        user.streak.weeklyProgress = [false, false, false, false, false, false, false];
      }

      // Update streak
      if (lastActive && isYesterday(lastActive, now)) {
        // Consecutive day - increment streak
        user.streak.currentStreak += 1;
      } else if (!lastActive || !isYesterday(lastActive, now)) {
        // First activity or missed a day - reset to 1
        user.streak.currentStreak = 1;
      }

      // Update max streak
      if (user.streak.currentStreak > user.streak.maxStreak) {
        user.streak.maxStreak = user.streak.currentStreak;
      }

      // Mark today in weekly progress
      const todayIndex = getDayIndex(now);
      user.streak.weeklyProgress[todayIndex] = true;

      // Update last active date
      user.streak.lastActiveDate = now;

      await user.save();

      return res.status(200).json({
        message: 'Streak updated',
        currentStreak: user.streak.currentStreak,
        maxStreak: user.streak.maxStreak,
        weeklyProgress: user.streak.weeklyProgress,
        updated: true
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Daily streak error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
