import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '../../lib/jwt';
import connectDB from '../../lib/mongodb';
import User from '../../models/User';

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB max for avatar
      keepExtensions: true,
      filter: ({ mimetype }) => {
        return mimetype && mimetype.includes('image');
      },
    });

    const [, files] = await form.parse(req);
    const file = files.avatar?.[0];

    if (!file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ message: 'Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)' });
    }

    // Create avatars directory
    const targetDir = path.join(process.cwd(), 'public', 'avatars');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Generate filename with user ID
    const ext = path.extname(file.originalFilename || '.jpg');
    const fileName = `${decoded.userId}_${Date.now()}${ext}`;
    const targetPath = path.join(targetDir, fileName);

    // Move file
    fs.copyFileSync(file.filepath, targetPath);
    fs.unlinkSync(file.filepath);

    const avatarUrl = `/avatars/${fileName}`;

    // Update user in database
    await connectDB();
    
    // Delete old avatar file if exists
    const user = await User.findById(decoded.userId);
    if (user?.avatar) {
      const oldAvatarPath = path.join(process.cwd(), 'public', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    await User.findByIdAndUpdate(decoded.userId, { avatar: avatarUrl });

    return res.status(200).json({
      success: true,
      avatar: avatarUrl,
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return res.status(500).json({ message: 'Lỗi upload avatar' });
  }
}
