const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function listAllUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const User = require('../models/User').default || require('../models/User');

    const users = await User.find()
      .select('name email points createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log('\n📋 All Users in Database:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    users.forEach((user, index) => {
      const isTestAccount = user.email.includes('@test.com');
      const marker = isTestAccount ? '🧪 TEST' : '👤 REAL';
      const created = new Date(user.createdAt).toLocaleDateString('vi-VN');

      console.log(`${marker} ${(index + 1).toString().padStart(2)}. ${user.name.padEnd(20)} | ${user.email.padEnd(30)} | ${user.points || 0} pts | ${created}`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nTotal: ${users.length} users (${users.filter(u => u.email.includes('@test.com')).length} test accounts)\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listAllUsers();
