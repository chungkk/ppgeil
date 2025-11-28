import fs from 'fs';
import path from 'path';
import { requireAuth } from '../../lib/authMiddleware';
import connectDB from '../../lib/mongodb';
import { Lesson } from '../../lib/models/Lesson';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const days = parseInt(req.query.days) || 3;
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

    // Also check self-created lessons in localStorage (though this is server-side, we'll assume they're temporary)
    // For simplicity, we'll only check filesystem mtime

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    const textDir = path.join(process.cwd(), 'public', 'text');

    const oldAudioFiles = [];
    const oldJsonFiles = [];

    // Check audio files
    if (fs.existsSync(audioDir)) {
      const audioFiles = fs.readdirSync(audioDir);
      audioFiles.forEach(file => {
        const filePath = path.join(audioDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime.getTime() < cutoffTime && !usedAudioFiles.has(file)) {
          oldAudioFiles.push(file);
        }
      });
    }

    // Check JSON/text files
    if (fs.existsSync(textDir)) {
      const textFiles = fs.readdirSync(textDir);
      textFiles.forEach(file => {
        const filePath = path.join(textDir, file);
        const stats = fs.statSync(filePath);
        // Special handling for self-created lessons - they start with 'self_'
        const isSelfLesson = file.startsWith('self_');
        if (stats.mtime.getTime() < cutoffTime && !usedJsonFiles.has(file) && !isSelfLesson) {
          oldJsonFiles.push(file);
        }
      });
    }

    return res.status(200).json({
      audio: oldAudioFiles,
      json: oldJsonFiles
    });

  } catch (error) {
    console.error('Old files error:', error);
    return res.status(500).json({ message: 'Error getting old files' });
  }
}

export default requireAuth(handler);