import connectDB from '../../../lib/mongodb';
import UserBadge from '../../../lib/models/UserBadge';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';
import { BADGE_TYPES } from '../../../lib/constants/leagues';

const BADGE_INFO = {
  top_monthly: {
    name: 'Top Monthly',
    description: 'Achieved Top 10 in monthly leaderboard',
    icon: '🏆',
    requirement: 'Be in top 10 when month ends'
  },
  top_alltime: {
    name: 'Top All-Time',
    description: 'Currently in Top 10 all-time',
    icon: '👑',
    requirement: 'Have enough points to be in top 10'
  }
};

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

    // Get user's earned badges
    const userBadges = await UserBadge.find({ userId: decoded.userId })
      .sort({ awardedAt: -1 })
      .lean();

    // Format earned badges
    const earnedBadges = userBadges.map(badge => {
      const info = BADGE_INFO[badge.badgeType] || {};
      return {
        type: badge.badgeType,
        name: info.name || badge.badgeType,
        description: info.description || '',
        icon: info.icon || '🎖️',
        year: badge.year,
        month: badge.month,
        rank: badge.rank,
        points: badge.points,
        awardedAt: badge.awardedAt
      };
    });

    // Check if user is currently in top 10 all-time
    const currentUser = await User.findById(decoded.userId)
      .select('points createdAt')
      .lean();

    if (currentUser) {
      const usersAbove = await User.countDocuments({
        $or: [
          { points: { $gt: currentUser.points || 0 } },
          { points: currentUser.points || 0, createdAt: { $lt: currentUser.createdAt } }
        ]
      });

      const currentRank = usersAbove + 1;

      // Add top_alltime badge if currently in top 10 but not already earned
      if (currentRank <= 10) {
        const hasAlltimeBadge = earnedBadges.some(b => b.type === 'top_alltime');
        if (!hasAlltimeBadge) {
          earnedBadges.unshift({
            type: 'top_alltime',
            name: BADGE_INFO.top_alltime.name,
            description: BADGE_INFO.top_alltime.description,
            icon: BADGE_INFO.top_alltime.icon,
            rank: currentRank,
            points: currentUser.points,
            awardedAt: new Date(),
            isCurrent: true
          });
        }
      }
    }

    // List available badges
    const available = Object.entries(BADGE_INFO).map(([type, info]) => ({
      type,
      name: info.name,
      description: info.description,
      icon: info.icon,
      requirement: info.requirement
    }));

    res.status(200).json({
      success: true,
      data: {
        badges: earnedBadges,
        available,
        totalEarned: earnedBadges.length
      }
    });
  } catch (error) {
    console.error('Badges API error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải badges',
      error: error.message
    });
  }
}
