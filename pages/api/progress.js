import { optionalAuth } from '../../lib/authMiddleware';
import { UserProgress } from '../../lib/models/UserProgress';
import connectDB from '../../lib/mongodb';

async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'POST') {
    try {
      // Guest users cannot save progress
      if (!req.user) {
        return res.status(401).json({
          message: 'Vui lòng đăng nhập để lưu tiến trình',
          requiresAuth: true
        });
      }

      const { lessonId, mode, progress, studyTime } = req.body;

      // Validate required fields
      if (!lessonId || !mode) {
        return res.status(400).json({
          message: 'lessonId and mode are required'
        });
      }

      // Find existing progress or create new one
      let userProgress = await UserProgress.findOne({
        userId: req.user._id,
        lessonId,
        mode
      });

      if (userProgress) {
        // Update existing progress
        if (progress !== undefined) {
          userProgress.progress = progress;
        }
        // Ensure progress is never undefined
        if (!userProgress.progress || typeof userProgress.progress !== 'object') {
          userProgress.progress = {};
        }
        if (studyTime !== undefined) {
          userProgress.studyTime = studyTime;
        }
        await userProgress.save(); // This triggers pre-save middleware

        console.log('POST progress updated:', {
          lessonId,
          mode,
          studyTime: userProgress.studyTime,
          providedStudyTime: studyTime
        });
      } else {
        // Create new progress
        userProgress = new UserProgress({
          userId: req.user._id,
          lessonId,
          mode,
          progress: progress && typeof progress === 'object' ? progress : {},
          studyTime: studyTime || 0
        });
        await userProgress.save(); // This triggers pre-save middleware

        console.log('POST progress created:', {
          lessonId,
          mode,
          studyTime: userProgress.studyTime,
          providedStudyTime: studyTime
        });
      }

      return res.status(200).json({
        message: 'Lưu tiến trình thành công',
        completionPercent: userProgress.completionPercent,
        studyTime: userProgress.studyTime
      });
    } catch (error) {
      console.error('Save progress error:', error);
      console.error('Error details:', {
        lessonId: req.body.lessonId,
        mode: req.body.mode,
        userId: req.user?._id,
        errorMessage: error.message,
        errorStack: error.stack
      });
      return res.status(400).json({
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  if (req.method === 'GET') {
    try {
      // Guest users get empty progress
      if (!req.user) {
        return res.status(200).json({
          progress: {},
          studyTime: 0,
          isGuest: true
        });
      }

      const { lessonId, mode } = req.query;

      if (lessonId && mode) {
        const progressDoc = await UserProgress.findOne({ userId: req.user._id, lessonId, mode });
        const responseData = progressDoc ? {
          progress: progressDoc.progress || {},
          studyTime: progressDoc.studyTime || 0
        } : { progress: {}, studyTime: 0 };

        console.log('GET progress response:', {
          lessonId,
          mode,
          hasDoc: !!progressDoc,
          studyTime: responseData.studyTime
        });

        return res.status(200).json(responseData);
      }

      const allProgress = await UserProgress.find({ userId: req.user._id });
      return res.status(200).json(allProgress);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default optionalAuth(handler);
