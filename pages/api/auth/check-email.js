import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await connectDB();

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });

    return res.status(200).json({
      exists: !!user,
      isGoogleUser: user?.isGoogleUser || false
    });

  } catch (error) {
    console.error('Error checking email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
