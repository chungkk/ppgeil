import connectDB from '../../../lib/mongodb';
import RankHistory from '../../../lib/models/RankHistory';
import { verifyToken } from '../../../lib/jwt';

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

    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const history = await RankHistory.find({
      userId: decoded.userId,
      date: { $gte: startDate }
    })
      .sort({ date: 1 })
      .lean();

    // Format history data
    const formattedHistory = history.map(h => ({
      date: h.date.toISOString().split('T')[0],
      pointsRank: h.pointsRank || null,
      streakRank: h.streakRank || null,
      timeRank: h.timeRank || null,
      lessonsRank: h.lessonsRank || null,
      points: h.points || 0,
      streak: h.streak || 0,
      timeSpent: h.timeSpent || 0,
      lessonsCompleted: h.lessonsCompleted || 0
    }));

    // Calculate trend (compare first and last day)
    let trend = {
      points: { change: 0, direction: 'stable' },
      streak: { change: 0, direction: 'stable' },
      time: { change: 0, direction: 'stable' },
      lessons: { change: 0, direction: 'stable' }
    };

    if (formattedHistory.length >= 2) {
      const first = formattedHistory[0];
      const last = formattedHistory[formattedHistory.length - 1];

      // For ranks, negative change means improvement (moved up)
      const pointsChange = (first.pointsRank || 0) - (last.pointsRank || 0);
      const streakChange = (first.streakRank || 0) - (last.streakRank || 0);
      const timeChange = (first.timeRank || 0) - (last.timeRank || 0);
      const lessonsChange = (first.lessonsRank || 0) - (last.lessonsRank || 0);

      trend = {
        points: { 
          change: Math.abs(pointsChange), 
          direction: pointsChange > 0 ? 'up' : pointsChange < 0 ? 'down' : 'stable' 
        },
        streak: { 
          change: Math.abs(streakChange), 
          direction: streakChange > 0 ? 'up' : streakChange < 0 ? 'down' : 'stable' 
        },
        time: { 
          change: Math.abs(timeChange), 
          direction: timeChange > 0 ? 'up' : timeChange < 0 ? 'down' : 'stable' 
        },
        lessons: { 
          change: Math.abs(lessonsChange), 
          direction: lessonsChange > 0 ? 'up' : lessonsChange < 0 ? 'down' : 'stable' 
        }
      };
    }

    res.status(200).json({
      success: true,
      data: {
        history: formattedHistory,
        trend,
        period: {
          days,
          startDate: startDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      }
    });
  } catch (error) {
    console.error('Rank history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải lịch sử xếp hạng',
      error: error.message
    });
  }
}
