import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import UserBadge from '../../../lib/models/UserBadge';
import { verifyToken } from '../../../lib/jwt';
import { getLeagueByPoints, LEAGUES } from '../../../lib/constants/leagues';

async function getRankForCriteria(userId, sortField, userValue, userCreatedAt) {
  const sortKey = Object.keys(sortField)[0];
  let countQuery = {};
  
  if (sortKey === 'streak.currentStreak') {
    countQuery = {
      $or: [
        { 'streak.currentStreak': { $gt: userValue } },
        { 'streak.currentStreak': userValue, createdAt: { $lt: userCreatedAt } }
      ]
    };
  } else {
    countQuery = {
      $or: [
        { [sortKey]: { $gt: userValue } },
        { [sortKey]: userValue, createdAt: { $lt: userCreatedAt } }
      ]
    };
  }
  
  return await User.countDocuments(countQuery) + 1;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

    const currentUser = await User.findById(decoded.userId)
      .select('name email points streak totalTimeSpent lessonsCompleted weeklyPoints currentLeague createdAt')
      .lean();

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalUsers = await User.countDocuments();

    // Get ranks for all criteria in parallel
    const [pointsRank, streakRank, timeRank, lessonsRank, improvedRank] = await Promise.all([
      getRankForCriteria(decoded.userId, { points: -1 }, currentUser.points || 0, currentUser.createdAt),
      getRankForCriteria(decoded.userId, { 'streak.currentStreak': -1 }, currentUser.streak?.currentStreak || 0, currentUser.createdAt),
      getRankForCriteria(decoded.userId, { totalTimeSpent: -1 }, currentUser.totalTimeSpent || 0, currentUser.createdAt),
      getRankForCriteria(decoded.userId, { lessonsCompleted: -1 }, currentUser.lessonsCompleted || 0, currentUser.createdAt),
      getRankForCriteria(decoded.userId, { weeklyPoints: -1 }, currentUser.weeklyPoints || 0, currentUser.createdAt)
    ]);

    // Get league info
    const userLeague = currentUser.currentLeague || getLeagueByPoints(currentUser.points || 0);
    const leagueInfo = LEAGUES[userLeague] || LEAGUES.bronze;
    
    // Count users in same league
    const usersInLeague = await User.countDocuments({ currentLeague: userLeague });
    const leagueRank = await User.countDocuments({
      currentLeague: userLeague,
      $or: [
        { points: { $gt: currentUser.points || 0 } },
        { points: currentUser.points || 0, createdAt: { $lt: currentUser.createdAt } }
      ]
    }) + 1;

    // Check promotion/demotion status (top 5 promote, bottom 5 demote)
    const willPromote = userLeague !== 'diamond' && leagueRank <= 5;
    const willDemote = userLeague !== 'bronze' && leagueRank > usersInLeague - 5;

    // Get user badges
    const badges = await UserBadge.find({ userId: decoded.userId })
      .sort({ awardedAt: -1 })
      .limit(10)
      .lean();

    // Get surrounding users (2 above, 2 below based on points)
    const contextRange = 2;
    const skip = Math.max(0, pointsRank - contextRange - 1);
    
    const nearbyUsers = await User.find()
      .select('name points currentLeague createdAt')
      .sort({ points: -1, createdAt: 1 })
      .skip(skip)
      .limit(contextRange * 2 + 3)
      .lean();

    const surrounding = {
      above: [],
      below: []
    };

    nearbyUsers.forEach((user, index) => {
      const userRank = skip + index + 1;
      if (user._id.toString() === decoded.userId) return;
      
      const userData = {
        rank: userRank,
        name: user.name,
        points: user.points || 0,
        league: user.currentLeague || 'bronze'
      };

      if (userRank < pointsRank && surrounding.above.length < contextRange) {
        surrounding.above.push(userData);
      } else if (userRank > pointsRank && surrounding.below.length < contextRange) {
        surrounding.below.push(userData);
      }
    });

    // Sort above in descending rank order (closest first)
    surrounding.above.sort((a, b) => b.rank - a.rank);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: currentUser._id.toString(),
          name: currentUser.name,
          points: currentUser.points || 0,
          streak: currentUser.streak?.currentStreak || 0,
          maxStreak: currentUser.streak?.maxStreak || 0,
          timeSpent: currentUser.totalTimeSpent || 0,
          lessonsCompleted: currentUser.lessonsCompleted || 0,
          weeklyPoints: currentUser.weeklyPoints || 0
        },
        ranks: {
          points: { rank: pointsRank, total: totalUsers },
          streak: { rank: streakRank, total: totalUsers },
          time: { rank: timeRank, total: totalUsers },
          lessons: { rank: lessonsRank, total: totalUsers },
          improved: { rank: improvedRank, total: totalUsers }
        },
        league: {
          current: userLeague,
          name: leagueInfo.name,
          color: leagueInfo.color,
          icon: leagueInfo.icon,
          rankInLeague: leagueRank,
          totalInLeague: usersInLeague,
          willPromote,
          willDemote
        },
        badges: badges.map(b => ({
          type: b.badgeType,
          year: b.year,
          month: b.month,
          rank: b.rank,
          awardedAt: b.awardedAt
        })),
        surrounding
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
