import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';
import { RANKING_CRITERIA } from '../../../lib/constants/leagues';

const SORT_FIELDS = {
  points: { points: -1, createdAt: 1 },
  streak: { 'streak.currentStreak': -1, createdAt: 1 },
  time: { totalTimeSpent: -1, createdAt: 1 },
  lessons: { lessonsCompleted: -1, createdAt: 1 },
  improved: { weeklyPoints: -1, createdAt: 1 }
};

const VALUE_GETTERS = {
  points: (user) => user.points || 0,
  streak: (user) => user.streak?.currentStreak || 0,
  time: (user) => user.totalTimeSpent || 0,
  lessons: (user) => user.lessonsCompleted || 0,
  improved: (user) => user.weeklyPoints || 0
};

const VALUE_LABELS = {
  points: (val) => `${val} pts`,
  streak: (val) => `${val} days`,
  time: (val) => {
    const hours = Math.floor(val / 3600);
    const mins = Math.floor((val % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  },
  lessons: (val) => `${val} lessons`,
  improved: (val) => `+${val} pts`
};

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

    const { 
      criteria = 'points', 
      period = 'alltime',
      page = 1, 
      limit = 50 
    } = req.query;

    if (!SORT_FIELDS[criteria]) {
      return res.status(400).json({
        success: false,
        message: `Invalid criteria. Must be one of: ${Object.keys(SORT_FIELDS).join(', ')}`
      });
    }

    // Limit to 20 for non-logged-in users
    const maxLimit = currentUserId ? 100 : 20;
    const pageNum = currentUserId ? (parseInt(page) || 1) : 1;
    const limitNum = Math.min(parseInt(limit) || 50, maxLimit);
    const skip = (pageNum - 1) * limitNum;

    const sortField = SORT_FIELDS[criteria];
    const getValue = VALUE_GETTERS[criteria];
    const getLabel = VALUE_LABELS[criteria];

    const totalEntries = await User.countDocuments();

    const users = await User.find({})
      .select('name email points streak totalTimeSpent lessonsCompleted weeklyPoints currentLeague createdAt')
      .sort(sortField)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const leaderboard = users.map((user, index) => {
      const value = getValue(user);
      return {
        rank: skip + index + 1,
        id: user._id.toString(),
        name: user.name || 'Unknown User',
        value,
        valueLabel: getLabel(value),
        points: user.points || 0,
        streak: user.streak?.currentStreak || 0,
        timeSpent: user.totalTimeSpent || 0,
        lessonsCompleted: user.lessonsCompleted || 0,
        weeklyPoints: user.weeklyPoints || 0,
        league: user.currentLeague || 'bronze',
        badges: [],
        isCurrentUser: currentUserId === user._id.toString()
      };
    });

    let currentUserRank = null;
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId)
        .select('name points streak totalTimeSpent lessonsCompleted weeklyPoints currentLeague createdAt')
        .lean();

      if (currentUser) {
        const userValue = getValue(currentUser);
        const sortKey = Object.keys(sortField)[0];
        
        let countQuery = {};
        if (sortKey === 'streak.currentStreak') {
          countQuery = {
            $or: [
              { 'streak.currentStreak': { $gt: userValue } },
              { 'streak.currentStreak': userValue, createdAt: { $lt: currentUser.createdAt } }
            ]
          };
        } else {
          countQuery = {
            $or: [
              { [sortKey]: { $gt: userValue } },
              { [sortKey]: userValue, createdAt: { $lt: currentUser.createdAt } }
            ]
          };
        }

        const usersAbove = await User.countDocuments(countQuery);

        currentUserRank = {
          rank: usersAbove + 1,
          value: userValue,
          valueLabel: getLabel(userValue),
          points: currentUser.points || 0,
          streak: currentUser.streak?.currentStreak || 0,
          timeSpent: currentUser.totalTimeSpent || 0,
          lessonsCompleted: currentUser.lessonsCompleted || 0,
          weeklyPoints: currentUser.weeklyPoints || 0,
          league: currentUser.currentLeague || 'bronze'
        };
      }
    }

    const criteriaInfo = RANKING_CRITERIA[criteria] || {};

    res.status(200).json({
      success: true,
      data: {
        criteria,
        criteriaLabel: criteriaInfo.label || criteria,
        criteriaIcon: criteriaInfo.icon || '📊',
        period,
        leaderboard,
        currentUserRank,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalEntries / limitNum),
          totalEntries,
          perPage: limitNum,
          hasNextPage: pageNum < Math.ceil(totalEntries / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('By-criteria leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng xếp hạng',
      error: error.message
    });
  }
}
