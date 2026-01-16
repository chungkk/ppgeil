import connectDB from '../../../../lib/mongodb';
import mongoose from 'mongoose';

// Use same schema as dictionary.js
const DictionaryCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  word: { type: String, required: true },
  targetLang: { type: String, required: true },
  version: { type: String, required: true, default: 'v1' },
  data: { type: Object, required: true },
  hits: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true }
});

const DictionaryCache = mongoose.models.DictionaryCache ||
  mongoose.model('DictionaryCache', DictionaryCacheSchema);

// Simple authentication check
function isAuthorized(req, res) {
  const adminToken = process.env.ADMIN_TOKEN;

  // Fail if ADMIN_TOKEN is not configured
  if (!adminToken) {
    console.error('ADMIN_TOKEN environment variable is not configured');
    return { authorized: false, error: 'Admin token not configured' };
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const token = authHeader.substring(7);
  return { authorized: token === adminToken, error: 'Unauthorized' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Check authorization
  const auth = isAuthorized(req, res);
  if (!auth.authorized) {
    const statusCode = auth.error === 'Admin token not configured' ? 500 : 401;
    return res.status(statusCode).json({ success: false, message: auth.error });
  }

  try {
    await connectDB();

    // Get total cache entries
    const totalEntries = await DictionaryCache.countDocuments();

    // Get total hits across all cached words
    const hitStats = await DictionaryCache.aggregate([
      {
        $group: {
          _id: null,
          totalHits: { $sum: '$hits' },
          avgHits: { $avg: '$hits' },
          maxHits: { $max: '$hits' }
        }
      }
    ]);

    // Get version distribution
    const versionStats = await DictionaryCache.aggregate([
      {
        $group: {
          _id: '$version',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get language distribution
    const langStats = await DictionaryCache.aggregate([
      {
        $group: {
          _id: '$targetLang',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top 10 most accessed words
    const topWords = await DictionaryCache.find()
      .sort({ hits: -1 })
      .limit(10)
      .select('word targetLang hits createdAt');

    // Get cache age distribution
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const ageStats = {
      last24h: await DictionaryCache.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      last7days: await DictionaryCache.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      older: await DictionaryCache.countDocuments({ createdAt: { $lt: oneWeekAgo } })
    };

    return res.status(200).json({
      success: true,
      stats: {
        totalEntries,
        hitStats: hitStats[0] || { totalHits: 0, avgHits: 0, maxHits: 0 },
        versionDistribution: versionStats,
        languageDistribution: langStats,
        topWords,
        ageDistribution: ageStats
      }
    });

  } catch (error) {
    console.error('Cache stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get cache stats',
      error: error.message
    });
  }
}
