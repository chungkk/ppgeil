import fs from 'fs';
import path from 'path';
import { requireAuth } from '../../lib/authMiddleware';
import connectDB from '../../lib/mongodb';
import { Lesson } from '../../lib/models/Lesson';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const days = 3;
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Get all lessons to check which files are used
    const lessons = await Lesson.find({});
    const usedAudioFiles = new Set();
    const usedJsonFiles = new Set();

    lessons.forEach(lesson => {
      if (lesson.audio && lesson.audio.startsWith('/audio/')) {
        usedAudioFiles.add(path.basename(lesson.audio));
      }
      if (lesson.json && lesson.json.startsWith('/text/')) {
        usedJsonFiles.add(path.basename(lesson.json));
      }
    });

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    const textDir = path.join(process.cwd(), 'public', 'text');

    let deletedCount = 0;

    // Cleanup audio files
    if (fs.existsSync(audioDir)) {
      const audioFiles = fs.readdirSync(audioDir);
      for (const file of audioFiles) {
        const filePath = path.join(audioDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < cutoffTime && !usedAudioFiles.has(file)) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (error) {
          console.error(`Error deleting audio file ${file}:`, error);
        }
      }
    }

    // Cleanup JSON/text files (excluding self-created lessons)
    if (fs.existsSync(textDir)) {
      const textFiles = fs.readdirSync(textDir);
      for (const file of textFiles) {
        const filePath = path.join(textDir, file);
        try {
          const stats = fs.statSync(filePath);
          const isSelfLesson = file.startsWith('self_');
          if (stats.mtime.getTime() < cutoffTime && !usedJsonFiles.has(file) && !isSelfLesson) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (error) {
          console.error(`Error deleting JSON file ${file}:`, error);
        }
      }
    }

    return res.status(200).json({
      success: true,
      deletedCount,
      message: `Cleanup completed. Deleted ${deletedCount} old files.`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ message: 'Error running cleanup' });
  }
}

export default requireAuth(handler);