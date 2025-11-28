import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication (optional)
    const authHeader = req.headers.authorization;
    let currentUserId = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        currentUserId = decoded.userId;
      }
    }

    await connectDB();

    // Get pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch all-time leaderboard data (users sorted by total points)
    const totalEntries = await User.countDocuments();

    const users = await User.find({})
      .select('name email points monthlyPoints streak.currentStreak streak.maxStreak streak.maxStreakThisMonth createdAt')
      .sort({ points: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Map to leaderboard format
    const leaderboard = users.map((user, index) => ({
      rank: skip + index + 1,
      id: user._id.toString(),
      name: user.name || 'Unknown User',
      email: user.email || '',
      totalPoints: user.points || 0,
      monthlyPoints: user.monthlyPoints || 0,
      currentStreak: user.streak?.currentStreak || 0,
      maxStreak: user.streak?.maxStreak || 0,
      maxStreakThisMonth: user.streak?.maxStreakThisMonth || 0,
      isCurrentUser: currentUserId === user._id.toString()
    }));

    // Get current user's rank if authenticated
    let currentUserRank = null;
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId)
        .select('name email points monthlyPoints streak.currentStreak streak.maxStreak streak.maxStreakThisMonth createdAt')
        .lean();

      if (currentUser) {
        // Count users with higher points
        const usersAbove = await User.countDocuments({
          $or: [
            { points: { $gt: currentUser.points } },
            {
              points: currentUser.points,
              createdAt: { $lt: currentUser.createdAt }
            }
          ]
        });

        currentUserRank = {
          rank: usersAbove + 1,
          totalPoints: currentUser.points || 0,
          monthlyPoints: currentUser.monthlyPoints || 0,
          currentStreak: currentUser.streak?.currentStreak || 0,
          maxStreak: currentUser.streak?.maxStreak || 0,
          maxStreakThisMonth: currentUser.streak?.maxStreakThisMonth || 0
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        currentUserRank,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalEntries / limit),
          totalEntries,
          perPage: limit,
          hasNextPage: page < Math.ceil(totalEntries / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('All-time leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng xếp hạng tổng thể',
      error: error.message
    });
  }
}
