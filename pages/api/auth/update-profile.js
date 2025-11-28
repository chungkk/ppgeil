import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
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

    const { nativeLanguage, level, preferredDifficultyLevel } = req.body;

    if (!nativeLanguage && !level && !preferredDifficultyLevel) {
      return res.status(400).json({ message: 'Ít nhất một trường cần được cập nhật' });
    }

    const updateData = {};

    // Validate language code if provided
    if (nativeLanguage) {
      const validLanguages = ['vi', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
      if (!validLanguages.includes(nativeLanguage)) {
        return res.status(400).json({ message: 'Ngôn ngữ không hợp lệ' });
      }
      updateData.nativeLanguage = nativeLanguage;
    }

    // Validate level if provided
    if (level) {
      const validLevels = ['beginner', 'experienced', 'all'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ message: 'Trình độ không hợp lệ' });
      }
      updateData.level = level;
    }

    // Validate preferredDifficultyLevel if provided
    if (preferredDifficultyLevel) {
      const validDifficultyLevels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'c1c2'];
      if (!validDifficultyLevels.includes(preferredDifficultyLevel)) {
        return res.status(400).json({ message: 'Độ khó không hợp lệ' });
      }
      updateData.preferredDifficultyLevel = preferredDifficultyLevel;
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        nativeLanguage: user.nativeLanguage,
        level: user.level,
        preferredDifficultyLevel: user.preferredDifficultyLevel
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
}