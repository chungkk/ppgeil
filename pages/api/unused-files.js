import fs from 'fs';
import path from 'path';
import { requireAdmin } from '../../lib/authMiddleware';
import { Lesson } from '../../lib/models/Lesson';
import connectDB from '../../lib/mongodb';

async function getUnusedFiles() {
  await connectDB();

  // Get all lessons
  const lessons = await Lesson.find({}, 'audio json');

  // Collect used files
  const usedAudio = new Set();
  const usedJson = new Set();

  lessons.forEach(lesson => {
    if (lesson.audio) {
      const audioFile = lesson.audio.replace('/audio/', '');
      usedAudio.add(audioFile);
    }
    if (lesson.json) {
      const jsonFile = lesson.json.replace('/text/', '');
      usedJson.add(jsonFile);
    }
  });

  // Get all files in directories
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  const textDir = path.join(process.cwd(), 'public', 'text');

  const allAudioFiles = fs.existsSync(audioDir) ? fs.readdirSync(audioDir) : [];
  const allJsonFiles = fs.existsSync(textDir) ? fs.readdirSync(textDir) : [];

  // Find unused files
  const unusedAudio = allAudioFiles.filter(file => !usedAudio.has(file));
  const unusedJson = allJsonFiles.filter(file => !usedJson.has(file));

  return {
    audio: unusedAudio.map(file => `audio/${file}`),
    json: unusedJson.map(file => `text/${file}`)
  };
}

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const unusedFiles = await getUnusedFiles();
      return res.status(200).json(unusedFiles);
    } catch (error) {
      console.error('Get unused files error:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { files } = req.body; // array of file paths like 'audio/file.mp3'

      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ message: 'Invalid files list' });
      }

      const deleted = [];
      const errors = [];

      for (const filePath of files) {
        try {
          const fullPath = path.join(process.cwd(), 'public', filePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            deleted.push(filePath);
          } else {
            errors.push(`${filePath}: file not found`);
          }
        } catch (error) {
          errors.push(`${filePath}: ${error.message}`);
        }
      }

      return res.status(200).json({ deleted, errors });
    } catch (error) {
      console.error('Delete files error:', error);
      return res.status(500).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);