import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';
import { updateUserPointsAndStreak } from '../../../lib/helpers/pointsAndStreaks';

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
      // Get user's points
      return res.status(200).json({
        success: true,
        points: user.points || 0,
        monthlyPoints: user.monthlyPoints || 0
      });
    }

    if (req.method === 'POST') {
      // Update points (add or subtract)
      const { pointsChange, reason, completedToday = false } = req.body;

      if (typeof pointsChange !== 'number') {
        return res.status(400).json({ message: 'pointsChange phải là số' });
      }

      try {
        // Use helper function to update points and streaks
        const updatedUser = await updateUserPointsAndStreak(user, {
          points: pointsChange,
          completedToday: completedToday
        });

        await updatedUser.save();

        console.log(`✅ Points updated for user ${user.email}: ${pointsChange > 0 ? '+' : ''}${pointsChange} (reason: ${reason || 'N/A'})`);
        console.log(`  Total: ${updatedUser.points}, Monthly: ${updatedUser.monthlyPoints}`);

        return res.status(200).json({
          success: true,
          points: updatedUser.points,
          monthlyPoints: updatedUser.monthlyPoints,
          pointsChange,
          reason
        });
      } catch (saveError) {
        console.error('❌ Error saving user points:', saveError);
        return res.status(500).json({ 
          message: 'Lỗi khi lưu điểm', 
          error: saveError.message,
          stack: process.env.NODE_ENV === 'development' ? saveError.stack : undefined
        });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Points API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
