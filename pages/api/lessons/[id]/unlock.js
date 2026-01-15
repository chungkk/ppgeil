import connectDB from '../../../../lib/mongodb';
import { Lesson } from '../../../../lib/models/Lesson';
import User from '../../../../models/User';
import { requireAuth } from '../../../../lib/authMiddleware';

const UNLOCK_COST = 100;

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { id } = req.query;
    const dbUser = req.user;

    const lesson = await Lesson.findOne({ id });
    if (!lesson) {
      return res.status(404).json({ error: 'Bài học không tồn tại' });
    }

    if (lesson.isFreeLesson) {
      return res.status(400).json({ error: 'Bài học này đã miễn phí cho tất cả' });
    }

    // Initialize unlockedLessons if not exists (for existing users)
    if (!dbUser.unlockedLessons) {
      dbUser.unlockedLessons = [];
    }

    if (dbUser.unlockedLessons.includes(id)) {
      return res.status(400).json({ error: 'Bài học đã được unlock' });
    }

    // Check if user has free unlocks remaining (default to 2 for existing users without this field)
    const freeUnlocks = dbUser.freeUnlocksRemaining ?? 2;
    if (freeUnlocks > 0) {
      dbUser.unlockedLessons.push(id);
      dbUser.freeUnlocksRemaining = freeUnlocks - 1;
      await dbUser.save();

      return res.status(200).json({
        success: true,
        usedFreeUnlock: true,
        freeUnlocksRemaining: dbUser.freeUnlocksRemaining,
        message: 'Đã unlock bài học miễn phí!'
      });
    }

    // Check if user has enough points
    if (dbUser.points < UNLOCK_COST) {
      return res.status(400).json({
        error: 'Không đủ points',
        required: UNLOCK_COST,
        current: dbUser.points
      });
    }

    // Deduct points and unlock
    dbUser.points -= UNLOCK_COST;
    dbUser.unlockedLessons.push(id);
    await dbUser.save();

    return res.status(200).json({
      success: true,
      usedFreeUnlock: false,
      pointsDeducted: UNLOCK_COST,
      remainingPoints: dbUser.points,
      message: `Đã unlock bài học! Trừ ${UNLOCK_COST} points.`
    });

  } catch (error) {
    console.error('Unlock lesson error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
