import { requireAdmin } from '../../lib/authMiddleware';
import { Lesson } from '../../lib/models/Lesson';
import { ArticleCategory } from '../../lib/models/ArticleCategory';
import connectDB from '../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      // Check if request is from admin (has Authorization header)
      const isAdminRequest = !!req.headers.authorization;
      
      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      // For admin requests, no limit by default. For public, limit to 12
      const limit = isAdminRequest ? parseInt(req.query.limit) || 9999 : parseInt(req.query.limit) || 12;
      const skip = (page - 1) * limit;
      const difficulty = req.query.difficulty;
      const category = req.query.category; // T046: Add category filtering
      const beginnerLevels = ['A1', 'A2'];

      // Build filters
      const filters = {};

      // Level/difficulty filter
      if (difficulty === 'beginner') {
        filters.level = { $in: beginnerLevels };
      } else if (difficulty === 'experienced') {
        filters.level = { $nin: beginnerLevels };
      }

      // Category filter (T046-T047: slug or ObjectId)
      if (category) {
        // Check if it's an ObjectId or slug
        if (mongoose.Types.ObjectId.isValid(category)) {
          filters.category = category;
        } else {
          // It's a slug, find category first
          const cat = await ArticleCategory.findOne({ slug: category });
          if (cat) {
            filters.category = cat._id;
          } else {
            // Category not found, return empty results
            return res.status(200).json({
              lessons: [],
              total: 0,
              page,
              totalPages: 0
            });
          }
        }
      }

      // Parallel queries for better performance
      const [lessons, total] = await Promise.all([
        Lesson.find(filters)
          .populate('category') // T035: Populate category field
          .sort({ createdAt: -1 }) // Sort by newest first
          .skip(skip)
          .limit(limit)
          .lean(), // Returns plain JS objects (faster than Mongoose documents)
        Lesson.countDocuments(filters)
      ]);

      // Cache for 5 minutes, allow stale content while revalidating
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

      return res.status(200).json({
        lessons: lessons.filter(l => l && l._id),
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Get lessons error:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  return requireAdmin(adminHandler)(req, res);
}

async function adminHandler(req, res) {

  if (req.method === 'POST') {
    try {
      // Check if lesson with this id already exists
      const existingLesson = await Lesson.findOne({ id: req.body.id });
      if (existingLesson) {
        return res.status(400).json({ message: 'Bài học với ID này đã tồn tại' });
      }

      // Get the highest order number and increment it
      const maxOrderLesson = await Lesson.findOne().sort({ order: -1 });
      const nextOrder = maxOrderLesson ? maxOrderLesson.order + 1 : 1;

      // T033: Ensure category is assigned (default to system category if not provided)
      let lessonData = { ...req.body, order: nextOrder };
      if (!lessonData.category) {
        const defaultCategory = await ArticleCategory.findOne({ isSystem: true });
        if (defaultCategory) {
          lessonData.category = defaultCategory._id;
        }
      }

      const lesson = new Lesson(lessonData);
      if (!lesson.id || typeof lesson.id !== 'string' || lesson.id.trim() === '') {
        return res.status(400).json({ message: 'ID is required and must be a non-empty string' });
      }
      await lesson.save();
      
      // Populate category before returning
      await lesson.populate('category');
      
      return res.status(201).json(lesson);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;
      if (!id) {
        return res.status(400).json({ message: 'ID là bắt buộc' });
      }
      
      // T034: Support category updates
      // Use custom id field instead of MongoDB _id
      const updatedLesson = await Lesson.findOneAndUpdate(
        { id }, 
        updateData, 
        { new: true, runValidators: true }
      ).populate('category'); // Populate category in response
      
      if (!updatedLesson) {
        return res.status(404).json({ message: 'Không tìm thấy bài học' });
      }
      
      return res.status(200).json({ message: 'Cập nhật thành công', lesson: updatedLesson });
    } catch (error) {
      console.error('PUT error:', error);
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const { ids } = req.body; // Support deleting multiple lessons

      if (ids && Array.isArray(ids)) {
        // Delete multiple lessons
        await Lesson.deleteMany({ _id: { $in: ids } });
        return res.status(200).json({ message: `Xóa ${ids.length} bài học thành công` });
      } else if (id) {
        // Delete single lesson
        await Lesson.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Xóa thành công' });
      } else {
        return res.status(400).json({ message: 'ID hoặc danh sách IDs là bắt buộc' });
      }
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
