import connectDB from '../../../../lib/mongodb';
import mongoose from 'mongoose';

// Settings schema
const CacheSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const CacheSettings = mongoose.models.CacheSettings ||
  mongoose.model('CacheSettings', CacheSettingsSchema);

// Simple authentication check
function isAuthorized(req) {
  const adminToken = process.env.ADMIN_TOKEN || 'your-secret-admin-token';
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === adminToken;
}

export default async function handler(req, res) {
  // Check authorization
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    await connectDB();

    if (req.method === 'GET') {
      // Get cache settings
      const expiryDaysSetting = await CacheSettings.findOne({ key: 'CACHE_EXPIRY_DAYS' });
      const cacheVersion = await CacheSettings.findOne({ key: 'CACHE_VERSION' });

      return res.status(200).json({
        success: true,
        settings: {
          expiryDays: expiryDaysSetting?.value || 7,
          version: cacheVersion?.value || 'v1'
        }
      });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      // Update cache settings
      const { expiryDays, version } = req.body;

      if (expiryDays !== undefined) {
        const days = parseInt(expiryDays);
        if (isNaN(days) || days < 1 || days > 9999) {
          return res.status(400).json({
            success: false,
            message: 'Expiry days must be between 1 and 9999'
          });
        }

        await CacheSettings.updateOne(
          { key: 'CACHE_EXPIRY_DAYS' },
          { key: 'CACHE_EXPIRY_DAYS', value: days, updatedAt: new Date() },
          { upsert: true }
        );
      }

      if (version !== undefined) {
        await CacheSettings.updateOne(
          { key: 'CACHE_VERSION' },
          { key: 'CACHE_VERSION', value: version, updatedAt: new Date() },
          { upsert: true }
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully'
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error) {
    console.error('Cache settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to manage cache settings',
      error: error.message
    });
  }
}
