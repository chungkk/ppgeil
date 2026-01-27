import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { verifyToken } from '../../../lib/jwt';

/**
 * DELETE /api/auth/delete-account
 * Permanently delete user account and all associated data
 * Required by Apple App Store Guideline 5.1.1(v)
 */
export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Verify authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        await connectDB();

        // Find and delete the user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`🗑️ Deleting account for user: ${user.email}`);

        // Delete all user data
        // Note: Add more collections here if you have related data (progress, vocabulary, etc.)
        await User.findByIdAndDelete(decoded.userId);

        // TODO: Delete related data from other collections if needed
        // await Progress.deleteMany({ userId: decoded.userId });
        // await Vocabulary.deleteMany({ userId: decoded.userId });
        // await StudyStats.deleteMany({ userId: decoded.userId });

        console.log(`✅ Account deleted successfully: ${user.email}`);

        return res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete account error:', error);
        return res.status(500).json({
            message: error.message || 'Failed to delete account'
        });
    }
}
