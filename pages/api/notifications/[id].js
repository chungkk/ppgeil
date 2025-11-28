import connectDB from '../../../lib/mongodb';
import Notification from '../../../models/Notification';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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

    // Find and delete notification, ensuring it belongs to the user
    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: decoded.userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    return res.status(200).json({
      success: true,
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    console.error('Delete notification API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
