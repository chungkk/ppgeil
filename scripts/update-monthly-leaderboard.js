// Script to update monthly leaderboard with real data based on user activity
// Run: node scripts/update-monthly-leaderboard.js

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function updateMonthlyLeaderboard() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const User = require('../models/User').default || require('../models/User');
    const MonthlyLeaderboard = require('../lib/models/MonthlyLeaderboard').default || require('../lib/models/MonthlyLeaderboard');
    const { UserProgress } = require('../lib/models/UserProgress');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    console.log(`📊 Calculating real leaderboard data for ${month}/${year}...\n`);

    // Get all users
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users to process\n`);

    let processedCount = 0;

    for (const user of users) {
      try {
        // Calculate monthly activity for this user
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 1);

        // Get all progress records for this month
        const monthlyProgress = await UserProgress.find({
          userId: user._id,
          updatedAt: {
            $gte: startOfMonth,
            $lt: endOfMonth
          }
        });

        // Calculate metrics
        let totalSentencesCompleted = 0;
        let totalTimeSpent = 0;
        let lessonsCompleted = 0;
        let monthlyPoints = 0;

        // Track unique lessons completed
        const completedLessons = new Set();

        for (const progress of monthlyProgress) {
          // Count sentences based on progress data
          if (progress.progress.totalSentences && progress.progress.currentSentenceIndex) {
            // For shadowing mode
            const sentencesCompleted = Math.min(progress.progress.currentSentenceIndex, progress.progress.totalSentences);
            totalSentencesCompleted += sentencesCompleted;

            // Estimate time spent (rough calculation: 30 seconds per sentence)
            totalTimeSpent += sentencesCompleted * 30;
          } else if (progress.progress.totalWords && progress.progress.correctWords !== undefined) {
            // For dictation mode
            const completionRate = progress.progress.correctWords / progress.progress.totalWords;
            const sentencesCompleted = Math.round(progress.progress.totalSentences * completionRate);
            totalSentencesCompleted += sentencesCompleted;

            // Estimate time spent (rough calculation: 45 seconds per sentence for dictation)
            totalTimeSpent += sentencesCompleted * 45;
          }

          // Track unique lessons
          if (progress.completionPercent >= 80) { // Consider lesson completed if 80%+ done
            completedLessons.add(progress.lessonId);
          }
        }

        lessonsCompleted = completedLessons.size;

        // Calculate points based on activity
        // Points formula: sentences * 2 + lessons * 50 + time bonus
        monthlyPoints = (totalSentencesCompleted * 2) + (lessonsCompleted * 50);

        // Time bonus: 1 point per 10 minutes studied
        const timeBonus = Math.floor(totalTimeSpent / 600);
        monthlyPoints += timeBonus;

        // Get current streak and max streak from user data
        const streakDays = user.streak?.currentStreak || 0;
        const maxStreak = user.streak?.maxStreak || 0;

        // Calculate max streak this month by tracking daily activity
        // For now, we'll use the max between current streak and stored max
        const maxStreakThisMonth = Math.max(streakDays, maxStreak);

        // Update or create monthly leaderboard entry
        await MonthlyLeaderboard.findOneAndUpdate(
          { userId: user._id, year, month },
          {
            monthlyPoints: Math.max(0, monthlyPoints),
            totalTimeSpent: Math.max(0, totalTimeSpent),
            sentencesCompleted: Math.max(0, totalSentencesCompleted),
            lessonsCompleted: Math.max(0, lessonsCompleted),
            streakDays: Math.max(0, streakDays),
            maxStreakThisMonth: Math.max(0, maxStreakThisMonth),
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        );

        processedCount++;
        console.log(`✅ ${processedCount}. ${user.name} (${user.email}):`);
        console.log(`   📊 Points: ${monthlyPoints}, Sentences: ${totalSentencesCompleted}, Lessons: ${lessonsCompleted}`);
        console.log(`   🔥 Current Streak: ${streakDays} days, Max Streak (Month): ${maxStreakThisMonth} days`);
        console.log(`   ⏱️  Time: ${Math.floor(totalTimeSpent / 60)}m ${totalTimeSpent % 60}s\n`);

      } catch (userError) {
        console.error(`❌ Error processing user ${user.email}:`, userError.message);
      }
    }

    console.log(`\n🎉 Successfully updated ${processedCount} leaderboard entries for ${month}/${year}`);
    console.log('\n📍 You can now view the updated leaderboard at: http://localhost:3000/leaderboard');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

updateMonthlyLeaderboard();