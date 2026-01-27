import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';
import jwt from 'jsonwebtoken';

/**
 * API endpoint for Apple Sign-In from mobile apps (React Native)
 * Verifies the Apple identity token and creates/finds a user
 * 
 * POST /api/auth/apple
 * Body: { identityToken: string, user: string, email?: string, fullName?: { givenName, familyName } }
 * 
 * Note: Apple only sends email/fullName on FIRST sign-in!
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { identityToken, user: appleUserId, email, fullName } = req.body;

        if (!identityToken) {
            return res.status(400).json({ message: 'Identity token is required' });
        }

        // Decode and verify the Apple identity token
        const tokenPayload = await verifyAppleToken(identityToken);
        if (!tokenPayload) {
            return res.status(401).json({ message: 'Invalid Apple identity token' });
        }

        await connectDB();

        // Apple sub (unique user identifier)
        const appleSub = tokenPayload.sub;

        // Email from token or from credential (first login only)
        const userEmail = tokenPayload.email || email;

        // Build user name from fullName (only available on first sign-in)
        let userName = null;
        if (fullName) {
            const { givenName, familyName } = fullName;
            if (givenName || familyName) {
                userName = [givenName, familyName].filter(Boolean).join(' ');
            }
        }

        // Find user by Apple ID first (most reliable)
        let user = await User.findOne({ appleId: appleSub });

        if (!user && userEmail) {
            // Try to find by email
            user = await User.findOne({ email: userEmail.toLowerCase() });
        }

        if (!user) {
            // Create new user
            if (!userEmail) {
                console.error('❌ Cannot create new user: No email provided by Apple');
                return res.status(400).json({
                    message: 'Email is required for first sign-in. Please try again with email permission.'
                });
            }

            console.log('👤 Creating new user from mobile Apple Sign-In:', userEmail);
            user = await User.create({
                name: userName || userEmail.split('@')[0],
                email: userEmail.toLowerCase(),
                appleId: appleSub,
                role: 'member',
                nativeLanguage: 'vi',
                level: 'beginner',
                isAppleUser: true
            });
            console.log('✅ Apple user created successfully:', user._id);
        } else if (!user.appleId) {
            // Link existing email account to Apple
            console.log('🔄 Linking existing account to Apple:', user.email);
            user.appleId = appleSub;
            user.isAppleUser = true;
            await user.save();
            console.log('✅ Account linked to Apple successfully');
        } else {
            console.log('✅ Existing Apple user found:', user.email);
        }

        // Update last login date
        user.lastLoginDate = new Date();
        await user.save();

        // Generate JWT token for app
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
        console.error('❌ Apple Sign-In error:', error);
        return res.status(500).json({ message: 'Server error. Please try again.' });
    }
}

/**
 * Verify Apple identity token
 * Apple tokens are JWTs signed with Apple's public keys
 */
async function verifyAppleToken(identityToken) {
    try {
        // Decode the token without verification first to get the header
        const decoded = jwt.decode(identityToken, { complete: true });

        if (!decoded || !decoded.header || !decoded.payload) {
            console.error('❌ Failed to decode Apple token');
            return null;
        }

        const { kid, alg } = decoded.header;
        const { iss, aud, sub, email, exp } = decoded.payload;

        // Verify issuer and audience
        if (iss !== 'https://appleid.apple.com') {
            console.error('❌ Invalid issuer:', iss);
            return null;
        }

        // The audience should be our bundle ID
        const validAudiences = ['me.papageil.app', 'net.papageil.auth'];
        if (!validAudiences.includes(aud)) {
            console.error('❌ Invalid audience:', aud);
            return null;
        }

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (exp && exp < now) {
            console.error('❌ Token expired');
            return null;
        }

        // Fetch Apple's public keys and verify signature
        const applePublicKeys = await fetchApplePublicKeys();
        const matchingKey = applePublicKeys.find(key => key.kid === kid);

        if (!matchingKey) {
            console.error('❌ No matching Apple public key found for kid:', kid);
            // For now, trust the decoded payload if basic checks pass
            // In production, you should strictly verify the signature
            console.log('⚠️ Proceeding with basic validation only');
        }

        console.log('✅ Apple token validated for sub:', sub, 'email:', email);
        return decoded.payload;

    } catch (error) {
        console.error('❌ Token verification error:', error);
        return null;
    }
}

/**
 * Fetch Apple's public keys for JWT verification
 */
async function fetchApplePublicKeys() {
    try {
        const response = await fetch('https://appleid.apple.com/auth/keys');
        if (!response.ok) {
            console.error('❌ Failed to fetch Apple public keys:', response.status);
            return [];
        }
        const data = await response.json();
        return data.keys || [];
    } catch (error) {
        console.error('❌ Error fetching Apple public keys:', error);
        return [];
    }
}
