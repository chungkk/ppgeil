import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';
import { 
  createNewCard, 
  calculateNextReview, 
  buildStudyQueue, 
  CardState,
  Rating 
} from '../../../lib/srs';

/**
 * SRS Progress API - Anki-style spaced repetition
 * 
 * GET: Get cards for study session
 * POST: Update card after review
 * DELETE: Reset progress
 */
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

  // GET - Get study queue for a level/topic
  if (req.method === 'GET') {
    try {
      const { level, topic, words } = req.query;
      
      const user = await User.findById(decoded.userId).select('srsProgress');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Initialize srsProgress if not exists
      const srsProgress = user.srsProgress || {};
      const deckKey = topic ? `topic_${topic}` : `level_${level}`;
      const deckData = srsProgress[deckKey] || { cards: {}, stats: {} };

      // If words provided, create cards for new words
      let wordList = [];
      if (words) {
        try {
          wordList = JSON.parse(words);
        } catch (e) {
          wordList = words.split(',').map(w => w.trim());
        }
      }

      // Build cards array with SRS data
      const cards = [];
      wordList.forEach(wordData => {
        const word = typeof wordData === 'string' ? wordData : wordData.word;
        const existingCard = deckData.cards[word];
        
        if (existingCard) {
          cards.push({ ...existingCard, word, wordData });
        } else {
          // New card
          cards.push({ ...createNewCard(word), wordData });
        }
      });

      // Build study queue
      const queue = buildStudyQueue(cards);

      return res.status(200).json({
        success: true,
        queue,
        deckStats: deckData.stats || {}
      });
    } catch (error) {
      console.error('Error getting SRS progress:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // POST - Update card after review
  if (req.method === 'POST') {
    try {
      const { level, topic, word, rating, cardData } = req.body;

      if (!word || !rating) {
        return res.status(400).json({ error: 'Missing word or rating' });
      }

      // Validate rating
      if (![Rating.AGAIN, Rating.HARD, Rating.GOOD, Rating.EASY].includes(rating)) {
        return res.status(400).json({ error: 'Invalid rating' });
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Initialize srsProgress if not exists
      if (!user.srsProgress) {
        user.srsProgress = {};
      }

      const deckKey = topic ? `topic_${topic}` : `level_${level}`;
      if (!user.srsProgress[deckKey]) {
        user.srsProgress[deckKey] = { cards: {}, stats: { totalReviews: 0, todayReviews: 0 } };
      }

      // Get or create card
      let card = user.srsProgress[deckKey].cards[word];
      if (!card) {
        card = createNewCard(word);
      }

      // Merge with provided card data if any
      if (cardData) {
        card = { ...card, ...cardData };
      }

      // Calculate next review
      const updatedCard = calculateNextReview(card, rating);

      // Save updated card
      user.srsProgress[deckKey].cards[word] = updatedCard;

      // Update stats
      user.srsProgress[deckKey].stats.totalReviews = 
        (user.srsProgress[deckKey].stats.totalReviews || 0) + 1;
      user.srsProgress[deckKey].stats.lastReviewDate = new Date();

      // Mark as modified for Mongoose
      user.markModified('srsProgress');
      await user.save();

      return res.status(200).json({
        success: true,
        card: updatedCard
      });
    } catch (error) {
      console.error('Error updating SRS progress:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // DELETE - Reset progress for a deck
  if (req.method === 'DELETE') {
    try {
      const { level, topic } = req.query;

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const deckKey = topic ? `topic_${topic}` : level ? `level_${level}` : null;

      if (deckKey && user.srsProgress) {
        delete user.srsProgress[deckKey];
        user.markModified('srsProgress');
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Progress reset successfully'
      });
    } catch (error) {
      console.error('Error resetting SRS progress:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
