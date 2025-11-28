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

    const { x, y } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }

    const city = await City.findOne({ userId: decoded.userId });
    if (!city) {
      return res.status(404).json({ message: 'Không tìm thấy thành phố' });
    }

    const buildingIndex = city.buildings.findIndex(b => b.x === x && b.y === y);
    if (buildingIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy tòa nhà tại vị trí này' });
    }

    city.buildings.splice(buildingIndex, 1);
    await city.save();

    console.log(`Building removed at (${x}, ${y})`);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa tòa nhà'
    });
  } catch (error) {
    console.error('Remove building API error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
}
