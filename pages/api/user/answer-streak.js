import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export default async function handler(req, res) {
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

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    if (req.method === 'GET') {
      // Check session timeout
      let currentStreak = user.answerStreak?.current || 0;
      const lastAnswerTime = user.answerStreak?.lastAnswerTime;
      
      if (lastAnswerTime) {
        const timeSinceLastAnswer = Date.now() - new Date(lastAnswerTime).getTime();
        if (timeSinceLastAnswer > SESSION_TIMEOUT && currentStreak > 0) {
          // Session expired, reset streak
          currentStreak = 0;
          user.answerStreak = {
            ...user.answerStreak,
            current: 0
          };
          await user.save();
        }
      }

      return res.status(200).json({
        success: true,
        current: currentStreak,
        max: user.answerStreak?.max || 0,
        lastAnswerTime: user.answerStreak?.lastAnswerTime || null
      });
    }

    if (req.method === 'POST') {
      const { action, currentStreak, maxStreak, previousStreak } = req.body;
      const now = new Date();

      if (!user.answerStreak) {
        user.answerStreak = { current: 0, max: 0, lastAnswerTime: null };
      }

      if (action === 'increment') {
        user.answerStreak.current = currentStreak;
        user.answerStreak.lastAnswerTime = now;
        
        if (maxStreak > (user.answerStreak.max || 0)) {
          user.answerStreak.max = maxStreak;
        }

        await user.save();

        console.log(`🔥 Answer streak updated for ${user.email}: ${currentStreak} (max: ${user.answerStreak.max})`);

        return res.status(200).json({
          success: true,
          current: user.answerStreak.current,
          max: user.answerStreak.max,
          lastAnswerTime: user.answerStreak.lastAnswerTime
        });
      }

      if (action === 'reset') {
        user.answerStreak.current = 0;
        user.answerStreak.lastAnswerTime = now;
        
        await user.save();

        console.log(`💔 Answer streak reset for ${user.email} (was: ${previousStreak || 0})`);

        return res.status(200).json({
          success: true,
          current: 0,
          max: user.answerStreak.max,
          previousStreak: previousStreak || 0
        });
      }

      return res.status(400).json({ message: 'Invalid action' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Answer streak API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
