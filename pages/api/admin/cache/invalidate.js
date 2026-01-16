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

// Simple authentication check (you should use proper auth in production)
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
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Check authorization
  const auth = isAuthorized(req, res);
  if (!auth.authorized) {
    const statusCode = auth.error === 'Admin token not configured' ? 500 : 401;
    return res.status(statusCode).json({ success: false, message: auth.error });
  }

  const { word, targetLang, version, clearAll } = req.body;

  try {
    await connectDB();

    if (clearAll) {
      // Clear all cache
      const result = await DictionaryCache.deleteMany({});
      return res.status(200).json({
        success: true,
        message: `Cleared all cache entries`,
        deletedCount: result.deletedCount
      });
    }

    if (version) {
      // Clear all entries of a specific version
      const result = await DictionaryCache.deleteMany({ version });
      return res.status(200).json({
        success: true,
        message: `Cleared all cache entries for version ${version}`,
        deletedCount: result.deletedCount
      });
    }

    if (word) {
      // Clear specific word cache
      const query = targetLang
        ? { word: word.toLowerCase(), targetLang }
        : { word: word.toLowerCase() };

      const result = await DictionaryCache.deleteMany(query);
      return res.status(200).json({
        success: true,
        message: `Cleared cache for word "${word}"`,
        deletedCount: result.deletedCount
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Please provide word, version, or clearAll parameter'
    });

  } catch (error) {
    console.error('Cache invalidation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache',
      error: error.message
    });
  }
}
