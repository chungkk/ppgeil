// Script to sync user stats - initialize missing fields and ensure consistency
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function syncUserStats() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');

    const users = await User.find({});
    console.log(`📊 Found ${users.length} users\n`);

    let updatedCount = 0;

    for (const user of users) {
      let needsUpdate = false;
      const updates = {};

      // Initialize streak fields if missing
      if (!user.streak) {
        updates.streak = {
          currentStreak: 0,
          maxStreak: 0,
          maxStreakThisMonth: 0,
          lastActivityDate: null,
          weeklyProgress: [false, false, false, false, false, false, false]
        };
        needsUpdate = true;
      } else {
        // Check individual streak fields
        // If maxStreak is missing or less than current streak, set it to current streak
        if (user.streak.maxStreak === undefined || user.streak.maxStreak < (user.streak.currentStreak || 0)) {
          updates['streak.maxStreak'] = user.streak.currentStreak || 0;
          needsUpdate = true;
        }
        // If maxStreakThisMonth is missing or less than current streak, set it to current streak
        if (user.streak.maxStreakThisMonth === undefined || user.streak.maxStreakThisMonth < (user.streak.currentStreak || 0)) {
          updates['streak.maxStreakThisMonth'] = user.streak.currentStreak || 0;
          needsUpdate = true;
        }
      }

      // Initialize points if missing
      if (user.points === undefined) {
        updates.points = 0;
        needsUpdate = true;
      }

      // Initialize monthlyPoints if missing
      if (user.monthlyPoints === undefined) {
        updates.monthlyPoints = 0;
        needsUpdate = true;
      }

      // Initialize lastMonthlyReset if missing
      if (!user.lastMonthlyReset) {
        updates.lastMonthlyReset = new Date();
        needsUpdate = true;
      }

      if (needsUpdate) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        updatedCount++;
        console.log(`✅ Updated user: ${user.name} (${user.email})`);
        console.log(`   Points: ${user.points || 0}, Monthly: ${updates.monthlyPoints !== undefined ? updates.monthlyPoints : user.monthlyPoints || 0}`);
        console.log(`   Current Streak: ${user.streak?.currentStreak || 0}`);
        console.log(`   Max Streak: ${updates['streak.maxStreak'] !== undefined ? updates['streak.maxStreak'] : user.streak?.maxStreak || 0}`);
        console.log(`   Max Streak This Month: ${updates['streak.maxStreakThisMonth'] !== undefined ? updates['streak.maxStreakThisMonth'] : user.streak?.maxStreakThisMonth || 0}\n`);
      }
    }

    console.log(`\n🎉 Sync completed! Updated ${updatedCount} users out of ${users.length} total users.`);

    // Display summary
    console.log('\n📈 Summary:');
    const allUsers = await User.find({}).select('name email points monthlyPoints streak');

    console.log('\nTop 5 users by total points:');
    const topUsers = allUsers.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5);
    topUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} - ${user.points || 0} pts (Monthly: ${user.monthlyPoints || 0}, Max Streak: ${user.streak?.maxStreak || 0})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncUserStats();
