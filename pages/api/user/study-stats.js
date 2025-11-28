import { requireAuth } from '../../../lib/authMiddleware';
import { UserProgress } from '../../../lib/models/UserProgress';
import connectDB from '../../../lib/mongodb';

async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'GET') {
    try {
      // Get all user progress documents
      const allProgress = await UserProgress.find({ 
        userId: req.user._id 
      });

      // Calculate statistics
      let totalStudyTime = 0;
      let totalSessions = 0;
      const lessonStats = {};
      const modeStats = {
        dictation: { time: 0, lessons: 0 },
        shadowing: { time: 0, lessons: 0 }
      };

      allProgress.forEach(progress => {
        const studyTime = progress.studyTime || 0;
        totalStudyTime += studyTime;
        totalSessions++;

        // Per lesson stats
        if (!lessonStats[progress.lessonId]) {
          lessonStats[progress.lessonId] = {
            dictation: 0,
            shadowing: 0,
            total: 0
          };
        }
        lessonStats[progress.lessonId][progress.mode] += studyTime;
        lessonStats[progress.lessonId].total += studyTime;

        // Per mode stats
        if (modeStats[progress.mode]) {
          modeStats[progress.mode].time += studyTime;
          modeStats[progress.mode].lessons++;
        }
      });

      // Calculate averages
      const avgStudyTimePerSession = totalSessions > 0 
        ? Math.round(totalStudyTime / totalSessions) 
        : 0;

      const avgDictationTime = modeStats.dictation.lessons > 0
        ? Math.round(modeStats.dictation.time / modeStats.dictation.lessons)
        : 0;

      const avgShadowingTime = modeStats.shadowing.lessons > 0
        ? Math.round(modeStats.shadowing.time / modeStats.shadowing.lessons)
        : 0;

      // Format times to HH:MM:SS
      const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      return res.status(200).json({
        success: true,
        stats: {
          totalStudyTime: totalStudyTime,
          totalStudyTimeFormatted: formatTime(totalStudyTime),
          totalSessions: totalSessions,
          avgStudyTimePerSession: avgStudyTimePerSession,
          avgStudyTimePerSessionFormatted: formatTime(avgStudyTimePerSession),
          modeStats: {
            dictation: {
              totalTime: modeStats.dictation.time,
              totalTimeFormatted: formatTime(modeStats.dictation.time),
              lessonsCount: modeStats.dictation.lessons,
              avgTime: avgDictationTime,
              avgTimeFormatted: formatTime(avgDictationTime)
            },
            shadowing: {
              totalTime: modeStats.shadowing.time,
              totalTimeFormatted: formatTime(modeStats.shadowing.time),
              lessonsCount: modeStats.shadowing.lessons,
              avgTime: avgShadowingTime,
              avgTimeFormatted: formatTime(avgShadowingTime)
            }
          },
          lessonStats: lessonStats
        }
      });
    } catch (error) {
      console.error('Error fetching study stats:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

export default requireAuth(handler);
