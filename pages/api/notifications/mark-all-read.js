import connectDB from '../../../lib/mongodb';
import Notification from '../../../models/Notification';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

    const result = await Notification.updateMany(
      { userId: decoded.userId, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all as read API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
