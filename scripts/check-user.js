const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const User = require('../models/User').default || require('../models/User');

    const user = await User.findOne({ name: 'Ngoc Nguyễn' }).lean();

    if (user) {
      console.log('\n📧 User Information:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`ID:        ${user._id}`);
      console.log(`Name:      ${user.name}`);
      console.log(`Email:     ${user.email}`);
      console.log(`Points:    ${user.points || 0}`);
      console.log(`Streak:    ${user.streak?.currentStreak || 0} days`);
      console.log(`Created:   ${user.createdAt || 'N/A'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('❌ User "Ngoc Nguyễn" not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkUser();
