import connectDB from '../../../lib/mongodb';
import Notification from '../../../models/Notification';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    await connectDB();

    if (req.method === 'GET') {
      // Get user's notifications
      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;

      const notifications = await Notification.find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const unreadCount = await Notification.countDocuments({
        userId: decoded.userId,
        read: false
      });

      return res.status(200).json({
        success: true,
        notifications,
        unreadCount
      });
    }

    if (req.method === 'POST') {
      // Create a new notification (internal use or manual creation)
      const { type, message, data } = req.body;

      if (!type || !message) {
        return res.status(400).json({ message: 'Type và message là bắt buộc' });
      }

      const notification = await Notification.create({
        userId: decoded.userId,
        type,
        message,
        data: data || {}
      });

      return res.status(201).json({
        success: true,
        notification
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Notifications API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
