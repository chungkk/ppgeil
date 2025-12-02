/**
 * Weekly Leaderboard Reset Script
 * Resets weekly points for all users and archives to WeeklyLeaderboard
 * 
 * Run: node scripts/weekly-leaderboard-reset.js
 * Schedule: Run every Monday at 00:00 UTC+7
 * Cron: 0 17 * * 0 (17:00 UTC Sunday = 00:00 UTC+7 Monday)
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Get ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function weeklyReset() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = require('../models/User').default || require('../models/User');
    const WeeklyLeaderboard = require('../lib/models/WeeklyLeaderboard').default || require('../lib/models/WeeklyLeaderboard');

    const now = new Date();
    // Get last week's info (the week that just ended)
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 1); // Go to Sunday of last week
    const year = lastWeek.getFullYear();
    const week = getWeekNumber(lastWeek);

    console.log(`📅 Archiving week ${week} of ${year}\n`);

    // Check if already archived
    const existingArchive = await WeeklyLeaderboard.countDocuments({ year, week });
    if (existingArchive > 0) {
      console.log(`⚠️ Week ${week}/${year} already archived (${existingArchive} entries). Skipping...`);
      // Still proceed to reset weeklyPoints for users who might have earned points after archive
    }

    // Get all users with weekly points
    const users = await User.find({ weeklyPoints: { $gt: 0 } })
      .select('_id name weeklyPoints points totalTimeSpent lessonsCompleted')
      .lean();

    console.log(`👥 Found ${users.length} users with weekly points\n`);

    if (users.length > 0 && existingArchive === 0) {
      // Archive weekly stats
      const archives = users.map(user => ({
        userId: user._id.toString(),
        year,
        week,
        weeklyPoints: user.weeklyPoints || 0,
        startingPoints: (user.points || 0) - (user.weeklyPoints || 0),
        endingPoints: user.points || 0,
        timeSpent: user.totalTimeSpent || 0,
        lessonsCompleted: user.lessonsCompleted || 0
      }));

      // Sort by weekly points for ranking
      archives.sort((a, b) => b.weeklyPoints - a.weeklyPoints);
      archives.forEach((a, i) => { a.rank = i + 1; });

      try {
        const result = await WeeklyLeaderboard.insertMany(archives, { ordered: false });
        console.log(`✅ Archived ${result.length} weekly records`);
        
        // Show top 5
        console.log('\n🏆 Top 5 for the week:');
        archives.slice(0, 5).forEach((a, i) => {
          const user = users.find(u => u._id.toString() === a.userId);
          console.log(`   ${i + 1}. ${user?.name || 'Unknown'} - ${a.weeklyPoints} pts`);
        });
      } catch (err) {
        if (err.code === 11000) {
          console.log('⚠️ Some archives already exist (duplicate). Continuing...');
        } else {
          throw err;
        }
      }
    }

    // Reset weeklyPoints for all users
    console.log('\n🔄 Resetting weekly points...');
    const resetResult = await User.updateMany(
      {},
      { 
        $set: { 
          weeklyPoints: 0,
          lastWeeklyReset: now
        } 
      }
    );

    console.log(`✅ Reset weekly points for ${resetResult.modifiedCount} users`);
    console.log(`📅 Next reset: Next Monday 00:00 UTC+7`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

weeklyReset();
