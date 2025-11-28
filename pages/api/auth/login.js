import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Check if user is Google user
    if (user.isGoogleUser) {
      return res.status(400).json({
        message: 'Email này đã được đăng ký bằng Google. Vui lòng sử dụng "Tiếp tục với Google"'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Update last login date
    user.lastLoginDate = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      nativeLanguage: user.nativeLanguage,
      level: user.level,
      preferredDifficultyLevel: user.preferredDifficultyLevel
    });

    // Return user data and token
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        nativeLanguage: user.nativeLanguage,
        level: user.level,
        preferredDifficultyLevel: user.preferredDifficultyLevel,
        points: user.points || 0
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Lỗi server. Vui lòng thử lại.' });
  }
}
