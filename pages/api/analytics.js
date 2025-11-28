import connectDB from '../../lib/mongodb';
import mongoose from 'mongoose';

// Analytics Event Schema
const AnalyticsEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  event: { type: String, required: true, index: true },
  properties: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
  userAgent: { type: String },
  viewport: { 
    width: Number,
    height: Number
  }
});

// Compound index for efficient queries
AnalyticsEventSchema.index({ userId: 1, event: 1, timestamp: -1 });
AnalyticsEventSchema.index({ timestamp: -1 });

const AnalyticsEvent = mongoose.models.AnalyticsEvent || 
  mongoose.model('AnalyticsEvent', AnalyticsEventSchema);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Extract user from token (if available)
    let userId = null;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        // Token invalid, continue without userId (anonymous tracking)
        console.log('Invalid token for analytics, tracking anonymously');
      }
    }

    const { event, properties } = req.body;

    if (!event) {
      return res.status(400).json({ success: false, message: 'Event name required' });
    }

    // Save analytics event
    const analyticsEvent = new AnalyticsEvent({
      userId,
      event,
      properties: properties || {},
      timestamp: new Date(),
      userAgent: req.headers['user-agent']
    });

    await analyticsEvent.save();

    // Return success immediately (don't make user wait)
    res.status(200).json({ success: true });

    // Optional: Aggregate analytics in background (don't await)
    aggregateAnalytics(event, userId).catch(err => 
      console.error('Background aggregation error:', err)
    );

  } catch (error) {
    console.error('Analytics API error:', error);
    // Don't fail the request - analytics shouldn't break user experience
    res.status(200).json({ success: true }); 
  }
}

// Background task: Aggregate popular words, common errors, etc.
async function aggregateAnalytics(event, userId) {
  // Only aggregate dictionary-related events
  if (!event.startsWith('dictionary_')) return;

  // This could be expanded to update aggregated statistics
  // For example: most looked up words, cache hit rates, etc.
  
  // Implementation depends on your analytics requirements
  console.log(`[Analytics Aggregation] Event: ${event}, User: ${userId}`);
}
