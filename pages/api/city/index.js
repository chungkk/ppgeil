import connectDB from '../../../lib/mongodb';
import City from '../../../models/City';
import User from '../../../models/User';
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

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    if (req.method === 'GET') {
      let city = await City.findOne({ userId: decoded.userId });
      
      if (!city) {
        city = new City({
          userId: decoded.userId,
          gridSize: 20,
          buildings: [],
          totalSpent: 0
        });
        await city.save();
      }

      return res.status(200).json({
        success: true,
        city: {
          gridSize: city.gridSize,
          buildings: city.buildings,
          totalSpent: city.totalSpent
        },
        userPoints: user.points
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('City API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
