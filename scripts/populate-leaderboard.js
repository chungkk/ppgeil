// Script to populate leaderboard with test data
// Run: node scripts/populate-leaderboard.js

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function populateLeaderboard() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const User = require('../models/User').default || require('../models/User');
    const MonthlyLeaderboard = require('../lib/models/MonthlyLeaderboard').default || require('../lib/models/MonthlyLeaderboard');

    // Get all users
    const users = await User.find().limit(20);

    if (users.length === 0) {
      console.log('⚠️  No users found in database. Please create some users first.');
      process.exit(1);
    }

    console.log(`📊 Found ${users.length} users. Populating leaderboard...\n`);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let count = 0;

    for (const user of users) {
      const monthlyPoints = Math.floor(Math.random() * 10000) + 100;
      const totalTimeSpent = Math.floor(Math.random() * 36000) + 600; // 10 minutes to 10 hours
      const sentencesCompleted = Math.floor(Math.random() * 5000) + 50;
      const lessonsCompleted = Math.floor(Math.random() * 100) + 1;
      const streakDays = Math.floor(Math.random() * 30) + 1;

      await MonthlyLeaderboard.findOneAndUpdate(
        { userId: user._id, year, month },
        {
          monthlyPoints,
          totalTimeSpent,
          sentencesCompleted,
          lessonsCompleted,
          streakDays,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

      count++;
      console.log(`✅ ${count}. ${user.name}: ${monthlyPoints} points, ${sentencesCompleted} sentences`);
    }

    console.log(`\n🎉 Successfully populated ${count} leaderboard entries for ${month}/${year}`);
    console.log('\n📍 You can now view the leaderboard at: http://localhost:3000/leaderboard');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

populateLeaderboard();
