import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import MonthlyLeaderboard from '../../../lib/models/MonthlyLeaderboard';
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

    // Get year and month from query or use current
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1; // 1-12

    // Get pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Fetch monthly leaderboard data directly from User model
    const totalEntries = await User.countDocuments();

    const users = await User.find({})
      .select('name email points monthlyPoints streak.currentStreak streak.maxStreak streak.maxStreakThisMonth createdAt')
      .sort({ monthlyPoints: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Map to leaderboard format
    const leaderboard = users.map((user, index) => ({
      rank: skip + index + 1,
      id: user._id.toString(),
      name: user.name || 'Unknown User',
      email: user.email || '',
      monthlyPoints: user.monthlyPoints || 0,
      maxStreakThisMonth: user.streak?.maxStreakThisMonth || 0,
      isCurrentUser: currentUserId === user._id.toString()
    }));

    // Calculate countdown to end of month
    const lastDayOfMonth = new Date(year, month, 0); // Day 0 of next month = last day of current month
    const endOfMonth = new Date(year, month - 1, lastDayOfMonth.getDate(), 23, 59, 59, 999);
    const timeRemaining = endOfMonth - now;

    const countdown = {
      days: Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24))),
      hours: Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
      minutes: Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))),
      seconds: Math.max(0, Math.floor((timeRemaining % (1000 * 60)) / 1000)),
      totalSeconds: Math.max(0, Math.floor(timeRemaining / 1000))
    };

    // Get current user's rank if authenticated
    let currentUserRank = null;
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId)
        .select('name email points monthlyPoints streak.currentStreak streak.maxStreak streak.maxStreakThisMonth createdAt')
        .lean();

      if (currentUser) {
        // Count users with higher monthly points
        const usersAbove = await User.countDocuments({
          $or: [
            { monthlyPoints: { $gt: currentUser.monthlyPoints } },
            {
              monthlyPoints: currentUser.monthlyPoints,
              createdAt: { $lt: currentUser.createdAt }
            }
          ]
        });

        currentUserRank = {
          rank: usersAbove + 1,
          monthlyPoints: currentUser.monthlyPoints || 0,
          maxStreakThisMonth: currentUser.streak?.maxStreakThisMonth || 0
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        period: {
          year,
          month,
          monthName: new Date(year, month - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' })
        },
        countdown,
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
    console.error('Monthly leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng xếp hạng tháng',
      error: error.message
    });
  }
}
