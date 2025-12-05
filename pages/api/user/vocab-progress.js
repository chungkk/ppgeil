import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

// Spaced repetition intervals (in days)
const SR_INTERVALS = {
  new: 0,        // Review immediately
  learning: 1,   // Review after 1 day
  mastered: 7    // Review after 7 days
};

export default async function handler(req, res) {
  await dbConnect();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const defaultLevelProgress = {
    newWords: [],
    learningWords: [],
    masteredWords: [],
    reviewSchedule: {},
    totalSessions: 0,
    lastSessionDate: null
  };

  const defaultProgress = {
    a1: { ...defaultLevelProgress },
    a2: { ...defaultLevelProgress },
    b1: { ...defaultLevelProgress }
  };

  // GET - Load progress
  if (req.method === 'GET') {
    try {
      const user = await User.findById(decoded.userId).select('vocabProgress');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Convert Map to Object for JSON response
      const progress = user.vocabProgress || defaultProgress;
      const formattedProgress = {};
      
      ['a1', 'a2', 'b1'].forEach(level => {
        const levelData = progress[level] || defaultLevelProgress;
        formattedProgress[level] = {
          newWords: levelData.newWords || [],
          learningWords: levelData.learningWords || [],
          masteredWords: levelData.masteredWords || [],
          reviewSchedule: levelData.reviewSchedule instanceof Map 
            ? Object.fromEntries(levelData.reviewSchedule) 
            : (levelData.reviewSchedule || {}),
          totalSessions: levelData.totalSessions || 0,
          lastSessionDate: levelData.lastSessionDate
        };
      });

      // Calculate words due for review
      const now = new Date();
      ['a1', 'a2', 'b1'].forEach(level => {
        const schedule = formattedProgress[level].reviewSchedule;
        const dueForReview = [];
        
        Object.entries(schedule).forEach(([word, reviewDate]) => {
          if (new Date(reviewDate) <= now) {
            dueForReview.push(word);
          }
        });
        
        formattedProgress[level].dueForReview = dueForReview;
      });

      return res.status(200).json({
        vocabProgress: formattedProgress
      });
    } catch (error) {
      console.error('Error loading vocab progress:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // POST - Save session result with spaced repetition
  if (req.method === 'POST') {
    try {
      const { level, wordResults } = req.body;
      // wordResults: [{ word: string, result: 'new' | 'learning' | 'mastered' }]
      
      const validLevels = ['a1', 'a2', 'b1'];
      if (!validLevels.includes(level?.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid level' });
      }

      const levelKey = level.toLowerCase();
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Initialize vocabProgress if not exists
      if (!user.vocabProgress) {
        user.vocabProgress = { ...defaultProgress };
      }

      if (!user.vocabProgress[levelKey]) {
        user.vocabProgress[levelKey] = { ...defaultLevelProgress };
      }

      const levelProgress = user.vocabProgress[levelKey];
      
      // Initialize arrays if not exist
      if (!levelProgress.newWords) levelProgress.newWords = [];
      if (!levelProgress.learningWords) levelProgress.learningWords = [];
      if (!levelProgress.masteredWords) levelProgress.masteredWords = [];
      if (!levelProgress.reviewSchedule) levelProgress.reviewSchedule = new Map();

      const now = new Date();

      // Process each word result
      if (Array.isArray(wordResults)) {
        wordResults.forEach(({ word, result }) => {
          if (!word || !result) return;

          // Remove word from all lists first
          levelProgress.newWords = levelProgress.newWords.filter(w => w !== word);
          levelProgress.learningWords = levelProgress.learningWords.filter(w => w !== word);
          levelProgress.masteredWords = levelProgress.masteredWords.filter(w => w !== word);

          // Add to appropriate list based on result
          if (result === 'new') {
            if (!levelProgress.newWords.includes(word)) {
              levelProgress.newWords.push(word);
            }
            // Review tomorrow
            const nextReview = new Date(now);
            nextReview.setDate(nextReview.getDate() + SR_INTERVALS.learning);
            levelProgress.reviewSchedule.set(word, nextReview);
          } else if (result === 'learning') {
            if (!levelProgress.learningWords.includes(word)) {
              levelProgress.learningWords.push(word);
            }
            // Review in 3 days
            const nextReview = new Date(now);
            nextReview.setDate(nextReview.getDate() + 3);
            levelProgress.reviewSchedule.set(word, nextReview);
          } else if (result === 'mastered') {
            if (!levelProgress.masteredWords.includes(word)) {
              levelProgress.masteredWords.push(word);
            }
            // Review in 7 days
            const nextReview = new Date(now);
            nextReview.setDate(nextReview.getDate() + SR_INTERVALS.mastered);
            levelProgress.reviewSchedule.set(word, nextReview);
          }
        });
      }

      // Update session stats
      levelProgress.totalSessions = (levelProgress.totalSessions || 0) + 1;
      levelProgress.lastSessionDate = now;

      await user.save();

      // Format response
      const formattedLevel = {
        newWords: levelProgress.newWords,
        learningWords: levelProgress.learningWords,
        masteredWords: levelProgress.masteredWords,
        reviewSchedule: levelProgress.reviewSchedule instanceof Map 
          ? Object.fromEntries(levelProgress.reviewSchedule) 
          : levelProgress.reviewSchedule,
        totalSessions: levelProgress.totalSessions,
        lastSessionDate: levelProgress.lastSessionDate
      };

      return res.status(200).json({
        success: true,
        levelProgress: formattedLevel
      });
    } catch (error) {
      console.error('Error saving vocab progress:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // DELETE - Reset progress for a level
  if (req.method === 'DELETE') {
    try {
      const { level } = req.query;
      
      const validLevels = ['a1', 'a2', 'b1', 'all'];
      if (!validLevels.includes(level?.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid level' });
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (level === 'all') {
        user.vocabProgress = { ...defaultProgress };
      } else {
        const levelKey = level.toLowerCase();
        if (user.vocabProgress) {
          user.vocabProgress[levelKey] = { ...defaultLevelProgress };
        }
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Progress reset successfully'
      });
    } catch (error) {
      console.error('Error resetting vocab progress:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
