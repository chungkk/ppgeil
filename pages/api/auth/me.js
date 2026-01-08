import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    await connectDB();

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        role: user.role,
        nativeLanguage: user.nativeLanguage,
        level: user.level,
        preferredDifficultyLevel: user.preferredDifficultyLevel || 'b1',
        points: user.points || 0,
        streak: {
          currentStreak: user.streak?.currentStreak || 0,
          maxStreak: user.streak?.maxStreak || 0,
          lastActiveDate: user.streak?.lastActiveDate || null,
          weeklyProgress: user.streak?.weeklyProgress || [false, false, false, false, false, false, false]
        },
        answerStreak: user.answerStreak || {
          current: 0,
          max: 0,
          lastAnswerTime: null
        },
        currentLeague: user.currentLeague || 'bronze',
        totalTimeSpent: user.totalTimeSpent || 0,
        lessonsCompleted: user.lessonsCompleted || 0,
        weeklyPoints: user.weeklyPoints || 0,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}