import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, password, level = 'beginner' } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Tên, email và mật khẩu là bắt buộc'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email này đã được đăng ký'
      });
    }

    // Create new user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role: 'member',
      nativeLanguage: 'vi',
      level: level,
      isGoogleUser: false
    });

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
    return res.status(201).json({
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
    console.error('Registration error:', error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Email này đã được đăng ký'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: messages.join(', ')
      });
    }

    return res.status(500).json({
      error: 'Lỗi server. Vui lòng thử lại.'
    });
  }
}
