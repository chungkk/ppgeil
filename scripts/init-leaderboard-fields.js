/**
 * Script to initialize leaderboard fields for existing users
 * Run: node scripts/init-leaderboard-fields.js
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { LEAGUES } = require('../lib/constants/leagues');

function getLeagueByPoints(points) {
  if (points >= 50000) return 'diamond';
  if (points >= 15000) return 'platinum';
  if (points >= 5000) return 'gold';
  if (points >= 1000) return 'silver';
  return 'bronze';
}

async function initLeaderboardFields() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = require('../models/User').default || require('../models/User');

    const users = await User.find({});
    console.log(`👥 Found ${users.length} users to update\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const updates = {};
      let needsUpdate = false;

      // Initialize streak if not exists
      if (!user.streak || user.streak.currentStreak === undefined) {
        updates.streak = {
          currentStreak: 0,
          maxStreak: 0,
          lastActiveDate: null
        };
        needsUpdate = true;
      }

      // Initialize totalTimeSpent if not exists
      if (user.totalTimeSpent === undefined) {
        updates.totalTimeSpent = 0;
        needsUpdate = true;
      }

      // Initialize lessonsCompleted if not exists
      if (user.lessonsCompleted === undefined) {
        updates.lessonsCompleted = 0;
        needsUpdate = true;
      }

      // Initialize weeklyPoints if not exists
      if (user.weeklyPoints === undefined) {
        updates.weeklyPoints = 0;
        needsUpdate = true;
      }

      // Initialize lastWeeklyReset if not exists
      if (user.lastWeeklyReset === undefined) {
        updates.lastWeeklyReset = null;
        needsUpdate = true;
      }

      // Initialize currentLeague based on points
      if (!user.currentLeague) {
        updates.currentLeague = getLeagueByPoints(user.points || 0);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await User.findByIdAndUpdate(user._id, { $set: updates });
        updatedCount++;
        console.log(`✅ Updated ${user.name} (${user.email})`);
        if (updates.currentLeague) {
          console.log(`   League: ${updates.currentLeague} (${user.points || 0} points)`);
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`\n🎉 Initialization complete!`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Skipped: ${skippedCount} users (already initialized)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

initLeaderboardFields();
