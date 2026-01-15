import connectDB from '../../../../../lib/mongodb';
import { Lesson } from '../../../../../lib/models/Lesson';
import { requireAdmin } from '../../../../../lib/authMiddleware';

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { id } = req.query;
    const { isFreeLesson } = req.body;

    // If setting a new free lesson, unset the old one first (only 1 free lesson allowed)
    if (isFreeLesson === true) {
      await Lesson.updateMany({ isFreeLesson: true }, { isFreeLesson: false });
    }

    const lesson = await Lesson.findOneAndUpdate(
      { id },
      { isFreeLesson: !!isFreeLesson },
      { new: true }
    );

    if (!lesson) {
      return res.status(404).json({ error: 'Bài học không tồn tại' });
    }

    return res.status(200).json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        isFreeLesson: lesson.isFreeLesson
      },
      message: isFreeLesson ? 'Đã đặt bài học này là bài Free' : 'Đã bỏ bài Free'
    });

  } catch (error) {
    console.error('Set free lesson error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAdmin(handler);
