/**
 * Daily Rank Snapshot Script
 * Takes a snapshot of all users' ranks for progress tracking
 * 
 * Run: node scripts/daily-rank-snapshot.js
 * Schedule: Run daily at 00:05 UTC+7 (after weekly reset if any)
 * Cron: 5 17 * * * (17:05 UTC = 00:05 UTC+7)
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function createDailySnapshot() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = require('../models/User').default || require('../models/User');
    const RankHistory = require('../lib/models/RankHistory').default || require('../lib/models/RankHistory');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if snapshot already exists for today
    const existingSnapshot = await RankHistory.findOne({ date: today });
    if (existingSnapshot) {
      console.log('⚠️ Snapshot already exists for today. Skipping...');
      return;
    }

    console.log(`📸 Creating rank snapshot for ${today.toISOString().split('T')[0]}\n`);

    // Get all users sorted by different criteria
    const users = await User.find({})
      .select('_id name points streak totalTimeSpent lessonsCompleted weeklyPoints')
      .lean();

    if (users.length === 0) {
      console.log('⚠️ No users found. Skipping snapshot.');
      return;
    }

    console.log(`👥 Processing ${users.length} users...\n`);

    // Sort users by each criteria and assign ranks
    const sortByCriteria = (users, getValue) => {
      return [...users]
        .sort((a, b) => getValue(b) - getValue(a))
        .map((user, index) => ({ id: user._id.toString(), rank: index + 1 }));
    };

    const pointsRanks = sortByCriteria(users, u => u.points || 0);
    const streakRanks = sortByCriteria(users, u => u.streak?.currentStreak || 0);
    const timeRanks = sortByCriteria(users, u => u.totalTimeSpent || 0);
    const lessonsRanks = sortByCriteria(users, u => u.lessonsCompleted || 0);
    const improvedRanks = sortByCriteria(users, u => u.weeklyPoints || 0);

    // Create rank lookup maps
    const getRank = (ranks, id) => ranks.find(r => r.id === id)?.rank || null;

    // Create snapshots for all users
    const snapshots = users.map(user => {
      const userId = user._id.toString();
      return {
        userId,
        date: today,
        pointsRank: getRank(pointsRanks, userId),
        streakRank: getRank(streakRanks, userId),
        timeRank: getRank(timeRanks, userId),
        lessonsRank: getRank(lessonsRanks, userId),
        improvedRank: getRank(improvedRanks, userId),
        points: user.points || 0,
        streak: user.streak?.currentStreak || 0,
        timeSpent: user.totalTimeSpent || 0,
        lessonsCompleted: user.lessonsCompleted || 0,
        weeklyPoints: user.weeklyPoints || 0
      };
    });

    // Batch insert snapshots
    const result = await RankHistory.insertMany(snapshots, { ordered: false });

    console.log(`✅ Created ${result.length} rank snapshots`);
    console.log(`📅 Date: ${today.toISOString().split('T')[0]}`);
    console.log(`👤 Sample snapshot:`, JSON.stringify(snapshots[0], null, 2));

  } catch (error) {
    console.error('❌ Error creating snapshot:', error.message);
    if (error.code === 11000) {
      console.log('⚠️ Some snapshots already exist (duplicate key). This is OK.');
    } else {
      console.error(error);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

createDailySnapshot();
