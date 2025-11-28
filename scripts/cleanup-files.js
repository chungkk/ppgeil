const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deutsch-app');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Lesson schema (simplified)
const lessonSchema = new mongoose.Schema({
  audio: String,
  json: String,
  // other fields...
});

const Lesson = mongoose.model('Lesson', lessonSchema);

async function cleanupOldFiles() {
  try {
    console.log('Starting cleanup of old files...');

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
            console.log(`Deleted old audio file: ${file}`);
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
            console.log(`Deleted old JSON file: ${file}`);
            deletedCount++;
          }
        } catch (error) {
          console.error(`Error deleting JSON file ${file}:`, error);
        }
      }
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} old files.`);

  } catch (error) {
    console.error('Cleanup error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run cleanup immediately if called directly
if (require.main === module) {
  cleanupOldFiles();
}

// Schedule daily cleanup at 2 AM
cron.schedule('0 2 * * *', () => {
  console.log('Running scheduled cleanup...');
  cleanupOldFiles();
});

console.log('File cleanup scheduler started. Will run daily at 2 AM.');

module.exports = { cleanupOldFiles };