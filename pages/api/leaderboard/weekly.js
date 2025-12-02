import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import WeeklyLeaderboard from '../../../lib/models/WeeklyLeaderboard';
import { verifyToken } from '../../../lib/jwt';
import { getLeagueByPoints } from '../../../lib/constants/leagues';

// Get current week number and year
function getWeekInfo() {
  const now = new Date();
  // Set to UTC+7
  const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  
  // Get first day of year
  const startOfYear = new Date(utc7.getFullYear(), 0, 1);
  const days = Math.floor((utc7 - startOfYear) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return { year: utc7.getFullYear(), week };
}

// Get countdown to next Monday 00:00 UTC+7
function getCountdown() {
  const now = new Date();
  const utc7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  
  // Find next Monday
  const daysUntilMonday = (8 - utc7.getDay()) % 7 || 7;
  const nextMonday = new Date(utc7);
  nextMonday.setDate(utc7.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  const diff = nextMonday - utc7;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  // Convert resetAt back to UTC for ISO string
  const resetAtUTC = new Date(nextMonday.getTime() - 7 * 60 * 60 * 1000);
  
  return {
    days,
    hours,
    minutes,
    resetAt: resetAtUTC.toISOString()
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
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

    // Limit to 20 for non-logged-in users
    const maxLimit = currentUserId ? 100 : 20;
    const page = currentUserId ? (parseInt(req.query.page) || 1) : 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, maxLimit);
    const skip = (page - 1) * limit;

    // Get users sorted by weeklyPoints
    const totalEntries = await User.countDocuments();

    const users = await User.find({})
      .select('name points weeklyPoints totalTimeSpent lessonsCompleted currentLeague createdAt')
      .sort({ weeklyPoints: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const leaderboard = users.map((user, index) => ({
      rank: skip + index + 1,
      id: user._id.toString(),
      name: user.name || 'Unknown User',
      weeklyPoints: user.weeklyPoints || 0,
      totalPoints: user.points || 0,
      league: user.currentLeague || getLeagueByPoints(user.points || 0),
      badges: [],
      isCurrentUser: currentUserId === user._id.toString()
    }));

    // Get current user's weekly rank
    let currentUserRank = null;
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId)
        .select('name weeklyPoints points currentLeague createdAt')
        .lean();

      if (currentUser) {
        const usersAbove = await User.countDocuments({
          $or: [
            { weeklyPoints: { $gt: currentUser.weeklyPoints || 0 } },
            { weeklyPoints: currentUser.weeklyPoints || 0, createdAt: { $lt: currentUser.createdAt } }
          ]
        });

        currentUserRank = {
          rank: usersAbove + 1,
          weeklyPoints: currentUser.weeklyPoints || 0,
          totalPoints: currentUser.points || 0,
          league: currentUser.currentLeague || getLeagueByPoints(currentUser.points || 0)
        };
      }
    }

    const countdown = getCountdown();

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        currentUserRank,
        countdown,
        weekInfo: getWeekInfo(),
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
    console.error('Weekly leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng xếp hạng tuần',
      error: error.message
    });
  }
}
