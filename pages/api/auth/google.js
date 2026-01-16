import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';

/**
 * API endpoint for Google Sign-In from mobile apps
 * Verifies the Google ID token and creates/finds a user
 * 
 * POST /api/auth/google
 * Body: { idToken: string, user: { id, email, name, photo } }
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { idToken, user: googleUser } = req.body;

        if (!idToken || !googleUser?.email) {
            return res.status(400).json({ message: 'ID token and user email are required' });
        }

        // Verify the Google ID token
        const isValidToken = await verifyGoogleToken(idToken, googleUser.email);
        if (!isValidToken) {
            return res.status(401).json({ message: 'Invalid Google token' });
        }

        await connectDB();

        const email = googleUser.email.toLowerCase();

        // Find or create user
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user
            console.log('👤 Creating new user from mobile Google Sign-In:', email);
            user = await User.create({
                name: googleUser.name || email.split('@')[0],
                email,
                googleId: googleUser.id,
                avatar: googleUser.photo || null,
                role: 'member',
                nativeLanguage: 'vi',
                level: 'beginner',
                isGoogleUser: true
            });
            console.log('✅ User created successfully:', user._id);
        } else if (!user.googleId) {
            // Link existing email account to Google
            console.log('🔄 Linking existing account to Google:', email);
            user.googleId = googleUser.id;
            user.isGoogleUser = true;
            if (googleUser.photo && !user.avatar) {
                user.avatar = googleUser.photo;
            }
            await user.save();
            console.log('✅ Account linked successfully');
        } else {
            console.log('✅ Existing Google user found:', email);
        }

        // Update last login date
        user.lastLoginDate = new Date();
        await user.save();

        // Generate JWT token
        const token = generateToken({
            userId: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            nativeLanguage: user.nativeLanguage,
            level: user.level,
            preferredDifficultyLevel: user.preferredDifficultyLevel
        });

        // Return user data and token
        return res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar || null,
                role: user.role,
                nativeLanguage: user.nativeLanguage,
                level: user.level,
                preferredDifficultyLevel: user.preferredDifficultyLevel,
                points: user.points || 0
            }
        });

    } catch (error) {
        console.error('❌ Google Sign-In error:', error);
        return res.status(500).json({ message: 'Server error. Please try again.' });
    }
}

/**
 * Verify Google ID token using Google's tokeninfo endpoint
 */
async function verifyGoogleToken(idToken, expectedEmail) {
    try {
        const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
        );

        if (!response.ok) {
            console.error('❌ Token verification failed:', response.status);
            return false;
        }

        const tokenInfo = await response.json();

        // Verify the email matches
        if (tokenInfo.email?.toLowerCase() !== expectedEmail.toLowerCase()) {
            console.error('❌ Email mismatch:', tokenInfo.email, 'vs', expectedEmail);
            return false;
        }

        // Verify the token is not expired
        const now = Math.floor(Date.now() / 1000);
        if (tokenInfo.exp && parseInt(tokenInfo.exp) < now) {
            console.error('❌ Token expired');
            return false;
        }

        console.log('✅ Google token verified for:', tokenInfo.email);
        return true;
    } catch (error) {
        console.error('❌ Token verification error:', error);
        return false;
    }
}
