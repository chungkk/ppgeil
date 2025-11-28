import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication (optional - make leaderboard public or private)
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

    // Get query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch total count for pagination
    const totalUsers = await User.countDocuments();

    // Fetch users sorted by points (descending) with pagination
    const users = await User.find()
      .select('name email points streak.currentStreak createdAt')
      .sort({ points: -1, createdAt: 1 }) // Sort by points desc, then by join date asc (earlier users rank higher on ties)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate rank for each user
    const leaderboard = users.map((user, index) => ({
      rank: skip + index + 1,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      points: user.points || 0,
      streak: user.streak?.currentStreak || 0,
      joinedAt: user.createdAt,
      isCurrentUser: currentUserId === user._id.toString()
    }));

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          perPage: limit,
          hasNextPage: page < Math.ceil(totalUsers / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng xếp hạng',
      error: error.message
    });
  }
}
