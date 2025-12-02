/**
 * Weekly League Update Script
 * Promotes top 5 and demotes bottom 5 users in each league
 * 
 * Run: node scripts/weekly-league-update.js
 * Schedule: Run every Monday at 00:15 UTC+7 (after weekly reset)
 * Cron: 15 17 * * 0 (17:15 UTC Sunday = 00:15 UTC+7 Monday)
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const PROMOTION_COUNT = 5;
const DEMOTION_COUNT = 5;

const LEAGUE_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

function getNextLeague(current) {
  const idx = LEAGUE_ORDER.indexOf(current);
  if (idx === -1 || idx >= LEAGUE_ORDER.length - 1) return null;
  return LEAGUE_ORDER[idx + 1];
}

function getPreviousLeague(current) {
  const idx = LEAGUE_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return LEAGUE_ORDER[idx - 1];
}

async function weeklyLeagueUpdate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = require('../models/User').default || require('../models/User');
    const UserLeague = require('../lib/models/UserLeague').default || require('../lib/models/UserLeague');

    // Get current week info
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    const year = now.getFullYear();

    console.log(`🏆 Processing league updates for week ${week}/${year}\n`);

    let totalPromotions = 0;
    let totalDemotions = 0;

    // Process each league
    for (const league of LEAGUE_ORDER) {
      console.log(`\n📊 Processing ${league.toUpperCase()} league...`);

      // Get users in this league sorted by points
      const usersInLeague = await User.find({ currentLeague: league })
        .select('_id name points')
        .sort({ points: -1, createdAt: 1 })
        .lean();

      const totalUsers = usersInLeague.length;
      console.log(`   Total users: ${totalUsers}`);

      if (totalUsers === 0) continue;

      // Promote top N (except diamond)
      if (league !== 'diamond') {
        const nextLeague = getNextLeague(league);
        const toPromote = usersInLeague.slice(0, Math.min(PROMOTION_COUNT, totalUsers));

        for (const user of toPromote) {
          await User.findByIdAndUpdate(user._id, { currentLeague: nextLeague });
          
          // Record promotion in history
          await UserLeague.create({
            userId: user._id.toString(),
            league: nextLeague,
            year,
            week,
            rankInLeague: 0, // Will be recalculated
            promoted: true,
            demoted: false,
            previousLeague: league
          });

          console.log(`   🚀 Promoted ${user.name} to ${nextLeague}`);
          totalPromotions++;
        }
      }

      // Demote bottom N (except bronze)
      if (league !== 'bronze' && totalUsers > DEMOTION_COUNT) {
        const prevLeague = getPreviousLeague(league);
        const toDemote = usersInLeague.slice(-DEMOTION_COUNT);

        for (const user of toDemote) {
          await User.findByIdAndUpdate(user._id, { currentLeague: prevLeague });
          
          // Record demotion in history
          await UserLeague.create({
            userId: user._id.toString(),
            league: prevLeague,
            year,
            week,
            rankInLeague: 0,
            promoted: false,
            demoted: true,
            previousLeague: league
          });

          console.log(`   ⬇️ Demoted ${user.name} to ${prevLeague}`);
          totalDemotions++;
        }
      }
    }

    console.log(`\n✅ League update complete!`);
    console.log(`   Promotions: ${totalPromotions}`);
    console.log(`   Demotions: ${totalDemotions}`);
    console.log(`📅 Week: ${week}/${year}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

weeklyLeagueUpdate();
