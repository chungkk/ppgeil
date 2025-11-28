import connectDB from '../../../../lib/mongodb';
import Notification from '../../../../models/Notification';
import { verifyToken } from '../../../../lib/jwt';

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

    const { id } = req.query;

    const notification = await Notification.findOne({
      _id: id,
      userId: decoded.userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    notification.read = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Mark as read API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
