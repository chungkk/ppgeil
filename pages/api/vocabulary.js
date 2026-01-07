import connectDB from '../../lib/mongodb';
import Vocabulary from '../../lib/models/Vocabulary';
import { verifyToken } from '../../lib/jwt';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  await connectDB();
  const userId = decoded.userId;

  // GET - Lấy danh sách từ vựng
  if (req.method === 'GET') {
    try {
      const { word, lessonId } = req.query;

      // Check if word exists
      if (word) {
        const existing = await Vocabulary.findOne({ userId, word: word.toLowerCase() });
        return res.status(200).json({ exists: !!existing, vocabulary: existing });
      }

      // Filter by lessonId if provided
      const filter = { userId };
      if (lessonId) {
        filter.lessonId = lessonId;
      }

      const vocabulary = await Vocabulary.find(filter).sort({ createdAt: -1 });
      
      // Transform to match frontend format
      const transformed = vocabulary.map(v => ({
        id: v._id.toString(),
        word: v.word,
        translation: v.translation,
        context: v.context,
        example: v.example || v.context,
        notes: v.notes,
        lessonId: v.lessonId,
        status: v.status,
        reviewCount: v.reviewCount,
        lastReviewAt: v.lastReviewAt,
        createdAt: v.createdAt
      }));

      return res.status(200).json(transformed);
    } catch (error) {
      console.error('GET vocabulary error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // POST - Lưu từ vựng mới
  if (req.method === 'POST') {
    try {
      const { word, translation, context, lessonId, example, notes, status } = req.body;

      if (!word || !translation) {
        return res.status(400).json({ message: 'Word and translation are required' });
      }

      // Check if word already exists for this user
      const existing = await Vocabulary.findOne({ userId, word: word.toLowerCase() });
      if (existing) {
        return res.status(400).json({ message: 'Từ này đã được lưu' });
      }

      const vocabulary = new Vocabulary({
        userId,
        word: word.toLowerCase(),
        translation,
        context: context || '',
        example: example || context || '',
        notes: notes || '',
        lessonId: lessonId || null,
        status: status || 'new'
      });

      await vocabulary.save();

      return res.status(201).json({
        success: true,
        message: 'Đã lưu từ vựng',
        vocabulary: {
          id: vocabulary._id.toString(),
          word: vocabulary.word,
          translation: vocabulary.translation,
          context: vocabulary.context,
          example: vocabulary.example,
          notes: vocabulary.notes,
          lessonId: vocabulary.lessonId,
          status: vocabulary.status,
          reviewCount: vocabulary.reviewCount,
          lastReviewAt: vocabulary.lastReviewAt,
          createdAt: vocabulary.createdAt
        }
      });
    } catch (error) {
      console.error('POST vocabulary error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // PUT - Cập nhật từ vựng (status, notes, etc.)
  if (req.method === 'PUT') {
    try {
      const { id, status, notes, reviewCount } = req.body;

      if (!id) {
        return res.status(400).json({ message: 'ID is required' });
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (reviewCount !== undefined) {
        updateData.reviewCount = reviewCount;
        updateData.lastReviewAt = new Date();
      }

      const vocabulary = await Vocabulary.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true }
      );

      if (!vocabulary) {
        return res.status(404).json({ message: 'Vocabulary not found' });
      }

      return res.status(200).json({
        success: true,
        vocabulary: {
          id: vocabulary._id.toString(),
          word: vocabulary.word,
          translation: vocabulary.translation,
          status: vocabulary.status,
          reviewCount: vocabulary.reviewCount,
          lastReviewAt: vocabulary.lastReviewAt
        }
      });
    } catch (error) {
      console.error('PUT vocabulary error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  // DELETE - Xóa từ vựng
  if (req.method === 'DELETE') {
    try {
      const { id, word } = req.query;

      let result;
      if (id) {
        result = await Vocabulary.findOneAndDelete({ _id: id, userId });
      } else if (word) {
        result = await Vocabulary.findOneAndDelete({ userId, word: word.toLowerCase() });
      } else {
        return res.status(400).json({ message: 'ID or word is required' });
      }

      if (!result) {
        return res.status(404).json({ message: 'Vocabulary not found' });
      }

      return res.status(200).json({ success: true, message: 'Đã xóa từ vựng' });
    } catch (error) {
      console.error('DELETE vocabulary error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
