import { verifyToken } from './jwt';
import User from '../models/User';
import connectDB from './mongodb';

export function requireAdmin(handler) {
  return async (req, res) => {
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
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền truy cập' });
      }

      req.user = user;
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  };
}

export function requireAuth(handler) {
  return async (req, res) => {
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
        return res.status(401).json({ message: 'Người dùng không tồn tại' });
      }

      req.user = user;
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  };
}

// Optional auth - allows both guests and authenticated users
export function optionalAuth(handler) {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      // If no auth header, treat as guest user
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return handler(req, res);
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded) {
        // Invalid token, treat as guest
        req.user = null;
        return handler(req, res);
      }

      await connectDB();
      const user = await User.findById(decoded.userId);
      
      // User not found, treat as guest
      req.user = user || null;
      return handler(req, res);
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      // On error, treat as guest and continue
      req.user = null;
      return handler(req, res);
    }
  };
}