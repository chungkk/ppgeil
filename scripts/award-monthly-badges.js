/**
 * Monthly Badge Award Script
 * Awards badges to top 10 users at the end of each month
 * 
 * Run: node scripts/award-monthly-badges.js
 * Schedule: Run on the 1st of each month at 00:10 UTC+7
 * Cron: 10 17 1 * * (17:10 UTC = 00:10 UTC+7 on 1st of month)
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function awardMonthlyBadges() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = require('../models/User').default || require('../models/User');
    const UserBadge = require('../lib/models/UserBadge').default || require('../lib/models/UserBadge');

    // Get last month's date
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1; // 1-12

    console.log(`🏆 Awarding badges for ${month}/${year}\n`);

    // Check if badges already awarded for this month
    const existingBadges = await UserBadge.countDocuments({
      badgeType: 'top_monthly',
      year,
      month
    });

    if (existingBadges > 0) {
      console.log(`⚠️ ${existingBadges} badges already awarded for ${month}/${year}. Skipping...`);
      return;
    }

    // Get top 10 users by monthly points
    const topUsers = await User.find({})
      .select('_id name monthlyPoints points')
      .sort({ monthlyPoints: -1, createdAt: 1 })
      .limit(10)
      .lean();

    if (topUsers.length === 0) {
      console.log('⚠️ No users found. Skipping badge awards.');
      return;
    }

    console.log(`👑 Top 10 users for ${month}/${year}:`);
    topUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} - ${user.monthlyPoints || 0} monthly pts`);
    });

    // Award badges to top 10
    const badges = topUsers.map((user, index) => ({
      userId: user._id.toString(),
      badgeType: 'top_monthly',
      year,
      month,
      rank: index + 1,
      points: user.monthlyPoints || 0,
      awardedAt: new Date()
    }));

    const result = await UserBadge.insertMany(badges, { ordered: false });

    console.log(`\n✅ Awarded ${result.length} badges!`);
    console.log(`📅 Period: ${month}/${year}`);
    console.log(`🥇 Top user: ${topUsers[0]?.name} with ${topUsers[0]?.monthlyPoints || 0} pts`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.log('⚠️ Some badges already exist (duplicate key). This is expected.');
    } else {
      console.error(error);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Also award all-time badges to current top 10
async function awardAlltimeBadges() {
  try {
    console.log('\n🌟 Checking all-time top 10 badges...');

    const User = require('../models/User').default || require('../models/User');
    const UserBadge = require('../lib/models/UserBadge').default || require('../lib/models/UserBadge');

    // Get current top 10 by total points
    const topUsers = await User.find({})
      .select('_id name points')
      .sort({ points: -1, createdAt: 1 })
      .limit(10)
      .lean();

    let awarded = 0;
    for (const [index, user] of topUsers.entries()) {
      // Check if user already has all-time badge
      const existing = await UserBadge.findOne({
        userId: user._id.toString(),
        badgeType: 'top_alltime'
      });

      if (!existing) {
        await UserBadge.create({
          userId: user._id.toString(),
          badgeType: 'top_alltime',
          rank: index + 1,
          points: user.points || 0,
          awardedAt: new Date()
        });
        console.log(`   ✅ Awarded all-time badge to ${user.name} (Rank #${index + 1})`);
        awarded++;
      }
    }

    if (awarded === 0) {
      console.log('   All top 10 users already have all-time badges.');
    } else {
      console.log(`\n✅ Awarded ${awarded} new all-time badges!`);
    }

  } catch (error) {
    console.error('❌ Error awarding all-time badges:', error.message);
  }
}

// Run both award functions
async function main() {
  await awardMonthlyBadges();
  await awardAlltimeBadges();
}

main();
