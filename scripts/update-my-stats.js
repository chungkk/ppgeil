// Script to update monthly stats for current user
// Run: node scripts/update-my-stats.js

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function updateMyStats() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const User = require('../models/User').default || require('../models/User');
    const MonthlyLeaderboard = require('../lib/models/MonthlyLeaderboard').default || require('../lib/models/MonthlyLeaderboard');

    // Find user by email
    const userEmail = 'chung@chung.pro';
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.log(`❌ User with email ${userEmail} not found.`);
      process.exit(1);
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`);
    console.log(`⭐ Current total points: ${user.points || 0}\n`);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Update monthly stats with sample data
    const monthlyStats = await MonthlyLeaderboard.findOneAndUpdate(
      { userId: user._id, year, month },
      {
        monthlyPoints: Math.floor(user.points || 2.5), // Use current points
        totalTimeSpent: 300, // 5 minutes
        sentencesCompleted: 10,
        lessonsCompleted: 2,
        streakDays: 1,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    console.log('✅ Monthly stats updated!');
    console.log(`📊 Monthly Points: ${monthlyStats.monthlyPoints}`);
    console.log(`⏱️  Time Spent: ${monthlyStats.totalTimeSpent}s (${Math.floor(monthlyStats.totalTimeSpent / 60)} minutes)`);
    console.log(`📝 Sentences: ${monthlyStats.sentencesCompleted}`);
    console.log(`📚 Lessons: ${monthlyStats.lessonsCompleted}`);
    console.log(`🔥 Streak: ${monthlyStats.streakDays} days\n`);

    // Also create some other users for comparison
    console.log('📊 Creating sample competitors...\n');

    const sampleUsers = [
      { name: 'Nam Dinh', email: 'nam@test.com', points: 5756, time: 89340, sentences: 5487, lessons: 45 },
      { name: 'Ngoc Hà', email: 'ngoc@test.com', points: 5748, time: 30960, sentences: 3016, lessons: 38 },
      { name: 'Ngoc Nguyễn', email: 'nguyen@test.com', points: 5230, time: 20580, sentences: 2472, lessons: 32 },
    ];

    for (const sampleData of sampleUsers) {
      let sampleUser = await User.findOne({ email: sampleData.email });

      if (!sampleUser) {
        // Create sample user if doesn't exist
        sampleUser = await User.create({
          name: sampleData.name,
          email: sampleData.email,
          password: '$2b$10$samplehash', // Sample hashed password
          points: sampleData.points,
          role: 'member',
          nativeLanguage: 'vi',
          level: 'experienced'
        });
        console.log(`✨ Created user: ${sampleData.name}`);
      } else {
        // Update points if user exists
        sampleUser.points = sampleData.points;
        await sampleUser.save();
        console.log(`📝 Updated user: ${sampleData.name}`);
      }

      // Update monthly stats
      await MonthlyLeaderboard.findOneAndUpdate(
        { userId: sampleUser._id, year, month },
        {
          monthlyPoints: sampleData.points,
          totalTimeSpent: sampleData.time,
          sentencesCompleted: sampleData.sentences,
          lessonsCompleted: sampleData.lessons,
          streakDays: Math.floor(Math.random() * 15) + 10,
          lastUpdated: new Date()
        },
        { upsert: true }
      );
    }

    console.log('\n🎉 All done! You can now view the leaderboard.');
    console.log('📍 Visit: http://localhost:3000/leaderboard');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

updateMyStats();
