// Test script to add points and verify the system works
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import connectDB from '../lib/mongodb.js';
import User from '../models/User.js';
import { updateUserPointsAndStreak } from '../lib/helpers/pointsAndStreaks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function testAddPoints() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');

    // Find user Chung
    const user = await User.findOne({ email: 'chung@chung.pro' });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('📊 Before adding points:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Total Points: ${user.points || 0}`);
    console.log(`   Monthly Points: ${user.monthlyPoints || 0}`);
    console.log(`   Current Streak: ${user.streak?.currentStreak || 0}`);
    console.log(`   Max Streak: ${user.streak?.maxStreak || 0}`);
    console.log(`   Max Streak This Month: ${user.streak?.maxStreakThisMonth || 0}\n`);

    // Add 10 points with completedToday = true to test streak update
    console.log('➕ Adding 10 points with completedToday = true...\n');

    const updatedUser = await updateUserPointsAndStreak(user, {
      points: 10,
      completedToday: true
    });

    await updatedUser.save();

    console.log('📊 After adding points:');
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Total Points: ${updatedUser.points || 0}`);
    console.log(`   Monthly Points: ${updatedUser.monthlyPoints || 0}`);
    console.log(`   Current Streak: ${updatedUser.streak?.currentStreak || 0}`);
    console.log(`   Max Streak: ${updatedUser.streak?.maxStreak || 0}`);
    console.log(`   Max Streak This Month: ${updatedUser.streak?.maxStreakThisMonth || 0}\n`);

    console.log('✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAddPoints();
