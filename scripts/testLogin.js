const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: '.env.local' });

async function testLogin() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://hoatiuthu_db_user:8PQdFjviFIKxyv65@cluster0.aj3nby6.mongodb.net/deutsch-shadowing?retryWrites=true&w=majority';
  console.log('URI:', uri.substring(0, 50) + '...');
  const client = new MongoClient(uri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected!\n');

    const db = client.db();
    
    // Test với user vừa đăng ký
    const email = 'admin@test.com'; // Hoặc email bạn vừa đăng ký
    const password = 'admin123';
    
    console.log('🔍 Finding user:', email);
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('✅ User found:');
    console.log('   ID:', user._id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Password hash:', user.password.substring(0, 20) + '...');
    
    console.log('\n🔐 Testing password verification...');
    const isValid = await bcrypt.compare(password, user.password);
    
    if (isValid) {
      console.log('✅ Password is CORRECT!');
      console.log('✅ Login should work!');
    } else {
      console.log('❌ Password is WRONG!');
      console.log('❌ This is why login fails!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
  }
}

testLogin();
