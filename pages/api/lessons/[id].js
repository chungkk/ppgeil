import { Lesson } from '../../../lib/models/Lesson';
import connectDB from '../../../lib/mongodb';
import { verifyToken } from '../../../lib/jwt';
import User from '../../../models/User';

export default async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'Lesson ID is required' });
      }
      
      const lesson = await Lesson.findOne({ id });
      
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }
      
      // Check if lesson is locked for this user
      let currentUser = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) {
          currentUser = await User.findById(decoded.userId).lean();
        }
      }
      
      const isAdmin = currentUser?.role === 'admin';
      const userUnlockedLessons = currentUser?.unlockedLessons || [];
      const isUnlocked = isAdmin || 
                        lesson.isFreeLesson || 
                        userUnlockedLessons.includes(lesson.id);
      
      // If locked, return limited info only
      if (!isUnlocked) {
        return res.status(200).json({
          id: lesson.id,
          title: lesson.title,
          displayTitle: lesson.displayTitle,
          description: lesson.description,
          level: lesson.level,
          category: lesson.category,
          thumbnail: lesson.thumbnail,
          isLocked: true,
          unlockCost: 100,
          userFreeUnlocks: currentUser?.freeUnlocksRemaining ?? 0,
          userPoints: currentUser?.points ?? 0
        });
      }
      
      // Return full lesson data
      return res.status(200).json({
        ...lesson.toObject(),
        isLocked: false
      });
    } catch (error) {
      console.error('Get lesson error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
