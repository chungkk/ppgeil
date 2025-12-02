import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';
import { LEAGUES, getLeagueByPoints } from '../../../lib/constants/leagues';

const PROMOTION_COUNT = 5;
const DEMOTION_COUNT = 5;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    let currentUserId = null;
    let userLeague = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        currentUserId = decoded.userId;
      }
    }

    await connectDB();

    // Get current user's league if authenticated
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId)
        .select('currentLeague points')
        .lean();
      if (currentUser) {
        userLeague = currentUser.currentLeague || getLeagueByPoints(currentUser.points || 0);
      }
    }

    // Use requested league or user's league or default to bronze
    const requestedLeague = req.query.league || userLeague || 'bronze';
    
    if (!LEAGUES[requestedLeague]) {
      return res.status(400).json({
        success: false,
        message: `Invalid league. Must be one of: ${Object.keys(LEAGUES).join(', ')}`
      });
    }

    const leagueInfo = LEAGUES[requestedLeague];
    
    // Limit to 20 for non-logged-in users
    const maxLimit = currentUserId ? 100 : 20;
    const page = currentUserId ? (parseInt(req.query.page) || 1) : 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, maxLimit);
    const skip = (page - 1) * limit;

    // Count total users in this league
    const totalUsersInLeague = await User.countDocuments({ currentLeague: requestedLeague });

    // Get users in this league sorted by points
    const users = await User.find({ currentLeague: requestedLeague })
      .select('name points currentLeague createdAt')
      .sort({ points: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Determine promotion/demotion zones
    const promotionZone = [];
    const demotionZone = [];

    // Only have promotion zone if not diamond
    if (requestedLeague !== 'diamond') {
      for (let i = 1; i <= Math.min(PROMOTION_COUNT, totalUsersInLeague); i++) {
        promotionZone.push(i);
      }
    }

    // Only have demotion zone if not bronze
    if (requestedLeague !== 'bronze' && totalUsersInLeague > DEMOTION_COUNT) {
      for (let i = totalUsersInLeague - DEMOTION_COUNT + 1; i <= totalUsersInLeague; i++) {
        demotionZone.push(i);
      }
    }

    // Build leaderboard with rank info
    const leaderboard = users.map((user, index) => {
      const rankInLeague = skip + index + 1;
      const willPromote = promotionZone.includes(rankInLeague);
      const willDemote = demotionZone.includes(rankInLeague);

      return {
        rank: rankInLeague, // Global rank would need additional query
        rankInLeague,
        id: user._id.toString(),
        name: user.name || 'Unknown User',
        points: user.points || 0,
        league: requestedLeague,
        badges: [],
        isCurrentUser: currentUserId === user._id.toString(),
        willPromote,
        willDemote
      };
    });

    // Get current user's rank in this league
    let currentUserRank = null;
    if (currentUserId && userLeague === requestedLeague) {
      const currentUser = await User.findById(currentUserId)
        .select('points createdAt')
        .lean();

      if (currentUser) {
        const usersAboveInLeague = await User.countDocuments({
          currentLeague: requestedLeague,
          $or: [
            { points: { $gt: currentUser.points || 0 } },
            { points: currentUser.points || 0, createdAt: { $lt: currentUser.createdAt } }
          ]
        });

        const rankInLeague = usersAboveInLeague + 1;
        const willPromote = promotionZone.includes(rankInLeague);
        const willDemote = demotionZone.includes(rankInLeague);

        currentUserRank = {
          rankInLeague,
          totalInLeague: totalUsersInLeague,
          points: currentUser.points || 0,
          willPromote,
          willDemote
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        league: {
          key: requestedLeague,
          name: leagueInfo.name,
          icon: leagueInfo.icon,
          color: leagueInfo.color,
          minPoints: leagueInfo.min,
          maxPoints: leagueInfo.max,
          totalUsers: totalUsersInLeague
        },
        leaderboard,
        currentUserRank,
        promotionZone,
        demotionZone,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsersInLeague / limit),
          totalEntries: totalUsersInLeague,
          perPage: limit,
          hasNextPage: page < Math.ceil(totalUsersInLeague / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Leagues leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải bảng xếp hạng theo league',
      error: error.message
    });
  }
}
