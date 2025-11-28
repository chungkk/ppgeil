import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
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

    // Get current user
    const currentUser = await User.findById(decoded.userId)
      .select('name email points streak.currentStreak createdAt')
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Count how many users have more points than current user
    // If points are equal, use createdAt as tiebreaker (earlier users rank higher)
    const usersAbove = await User.countDocuments({
      $or: [
        { points: { $gt: currentUser.points } },
        {
          points: currentUser.points,
          createdAt: { $lt: currentUser.createdAt }
        }
      ]
    });

    const rank = usersAbove + 1;
    const totalUsers = await User.countDocuments();

    // Get users around current user's rank (context)
    const contextRange = parseInt(req.query.context) || 5; // Get 5 users above and below
    const skip = Math.max(0, rank - contextRange - 1);
    const limit = contextRange * 2 + 1;

    const nearbyUsers = await User.find()
      .select('name email points streak.currentStreak createdAt')
      .sort({ points: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Map nearby users with ranks
    const nearbyLeaderboard = nearbyUsers.map((user, index) => ({
      rank: skip + index + 1,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      points: user.points || 0,
      streak: user.streak?.currentStreak || 0,
      joinedAt: user.createdAt,
      isCurrentUser: decoded.userId === user._id.toString()
    }));

    res.status(200).json({
      success: true,
      data: {
        currentUser: {
          id: currentUser._id.toString(),
          name: currentUser.name,
          email: currentUser.email,
          rank,
          points: currentUser.points || 0,
          streak: currentUser.streak?.currentStreak || 0,
          totalUsers
        },
        nearbyUsers: nearbyLeaderboard
      }
    });
  } catch (error) {
    console.error('User rank error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin xếp hạng',
      error: error.message
    });
  }
}
