import connectDB from '../../../lib/mongodb';
import MonthlyLeaderboard from '../../../lib/models/MonthlyLeaderboard';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const {
      pointsChange = 0,
      timeSpent = 0, // in seconds
      sentencesCompleted = 0,
      lessonsCompleted = 0
    } = req.body;

    // Input validation
    if (typeof pointsChange !== 'number' || typeof timeSpent !== 'number' ||
        typeof sentencesCompleted !== 'number' || typeof lessonsCompleted !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'All values must be numbers'
      });
    }

    // Validate ranges - prevent abuse
    if (pointsChange < 0 || pointsChange > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Points change must be between 0 and 10000'
      });
    }

    if (timeSpent < 0 || timeSpent > 86400) { // Max 24 hours
      return res.status(400).json({
        success: false,
        message: 'Time spent must be between 0 and 86400 seconds (24 hours)'
      });
    }

    if (sentencesCompleted < 0 || sentencesCompleted > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Sentences completed must be between 0 and 10000'
      });
    }

    if (lessonsCompleted < 0 || lessonsCompleted > 100) {
      return res.status(400).json({
        success: false,
        message: 'Lessons completed must be between 0 and 100'
      });
    }

    // Skip update if all values are zero
    if (pointsChange === 0 && timeSpent === 0 && sentencesCompleted === 0 && lessonsCompleted === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes to update',
        data: { monthlyPoints: 0, totalTimeSpent: 0, sentencesCompleted: 0, lessonsCompleted: 0 }
      });
    }

    // Get current year and month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Rate limiting: Check last update time
    const existingEntry = await MonthlyLeaderboard.findOne({
      userId: decoded.userId,
      year,
      month
    });

    if (existingEntry && existingEntry.lastUpdated) {
      const timeSinceLastUpdate = (now - existingEntry.lastUpdated) / 1000; // in seconds

      // Prevent updates more frequent than once per 30 seconds
      if (timeSinceLastUpdate < 30) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please wait before updating again.',
          retryAfter: Math.ceil(30 - timeSinceLastUpdate)
        });
      }
    }

    // Update or create monthly stats
    const monthlyStats = await MonthlyLeaderboard.findOneAndUpdate(
      {
        userId: decoded.userId,
        year,
        month
      },
      {
        $inc: {
          monthlyPoints: pointsChange,
          totalTimeSpent: timeSpent,
          sentencesCompleted: sentencesCompleted,
          lessonsCompleted: lessonsCompleted
        },
        $set: {
          lastUpdated: new Date()
        }
      },
      {
        upsert: true, // Create if doesn't exist
        new: true // Return updated document
      }
    );

    res.status(200).json({
      success: true,
      data: {
        monthlyPoints: monthlyStats.monthlyPoints,
        totalTimeSpent: monthlyStats.totalTimeSpent,
        sentencesCompleted: monthlyStats.sentencesCompleted,
        lessonsCompleted: monthlyStats.lessonsCompleted
      },
      message: 'Cập nhật thống kê tháng thành công'
    });
  } catch (error) {
    console.error('Update monthly stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thống kê tháng',
      error: error.message
    });
  }
}
