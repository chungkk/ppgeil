const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function updateRealUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = require('../models/User').default || require('../models/User');
    const MonthlyLeaderboard = require('../lib/models/MonthlyLeaderboard').default || require('../lib/models/MonthlyLeaderboard');

    // Get all real users
    const users = await User.find().select('name email').lean();

    console.log(`📊 Found ${users.length} users in database:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    console.log(`\n🗓️  Updating leaderboard for ${month}/${year}...\n`);

    // Update each user with realistic progressive data based on their position
    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // Create realistic data that decreases progressively
      // Top users have more points, more time, more sentences
      const rankFactor = users.length - i;
      const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3

      const monthlyPoints = Math.floor(500 + (rankFactor * 500) * randomFactor);
      const totalTimeSpent = Math.floor(1800 + (rankFactor * 1800) * randomFactor); // 30 min to 10 hours
      const sentencesCompleted = Math.floor(50 + (rankFactor * 250) * randomFactor);
      const lessonsCompleted = Math.floor(1 + (rankFactor * 5) * randomFactor);
      const streakDays = Math.floor(1 + Math.random() * 30);

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

      const hours = Math.floor(totalTimeSpent / 3600);
      const mins = Math.floor((totalTimeSpent % 3600) / 60);

      console.log(`✅ ${i + 1}. ${user.name.padEnd(20)} | ${monthlyPoints.toString().padStart(5)} pts | ${hours}h ${mins}m | ${sentencesCompleted.toString().padStart(4)} sentences | ${lessonsCompleted} lessons`);
    }

    console.log(`\n🎉 Successfully updated ${users.length} users!`);
    console.log(`📍 View at: http://localhost:3004/leaderboard\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

updateRealUsers();
