import connectDB from '../../../lib/mongodb';
import City from '../../../models/City';
import User from '../../../models/User';
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

    const { buildingType, x, y, cost } = req.body;

    if (!buildingType || typeof x !== 'number' || typeof y !== 'number' || typeof cost !== 'number') {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    if (user.points < cost) {
      return res.status(400).json({ message: 'Không đủ điểm', userPoints: user.points });
    }

    let city = await City.findOne({ userId: decoded.userId });
    if (!city) {
      city = new City({
        userId: decoded.userId,
        gridSize: 20,
        buildings: [],
        totalSpent: 0
      });
    }

    const existingBuilding = city.buildings.find(b => b.x === x && b.y === y);
    if (existingBuilding) {
      return res.status(400).json({ message: 'Vị trí này đã có tòa nhà' });
    }

    if (x < 0 || x >= city.gridSize || y < 0 || y >= city.gridSize) {
      return res.status(400).json({ message: 'Vị trí không hợp lệ' });
    }

    city.buildings.push({
      type: buildingType,
      x,
      y,
      placedAt: new Date()
    });
    city.totalSpent += cost;

    user.points -= cost;

    await Promise.all([city.save(), user.save()]);

    console.log(`Building placed: ${buildingType} at (${x}, ${y}) for ${cost} points by ${user.email}`);

    return res.status(200).json({
      success: true,
      building: {
        type: buildingType,
        x,
        y
      },
      userPoints: user.points,
      totalSpent: city.totalSpent
    });
  } catch (error) {
    console.error('Place building API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
