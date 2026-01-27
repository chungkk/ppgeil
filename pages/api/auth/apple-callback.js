// Apple Callback Handler - Manual implementation
// Handles the POST callback from Apple OAuth

import jwt from 'jsonwebtoken';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { generateToken } from '../../../lib/jwt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code, id_token, state, user: userDataString } = req.body;

        console.log('🍎 Apple Callback received:', { code: !!code, id_token: !!id_token, state: !!state });

        if (!id_token) {
            throw new Error('No id_token received from Apple');
        }

        // Decode the id_token (Apple's JWT)
        const decoded = jwt.decode(id_token);
        console.log('🍎 Decoded token:', decoded);

        if (!decoded || !decoded.sub) {
            throw new Error('Invalid id_token from Apple');
        }

        const appleId = decoded.sub;
        const email = decoded.email;

        // Parse user data (only sent on first sign-in)
        let userName = null;
        if (userDataString) {
            try {
                const userData = JSON.parse(userDataString);
                userName = userData.name ? `${userData.name.firstName || ''} ${userData.name.lastName || ''}`.trim() : null;
            } catch (e) {
                console.log('Could not parse user data:', e);
            }
        }

        await connectDB();

        // Find or create user
        let dbUser = await User.findOne({
            $or: [
                { appleId: appleId },
                ...(email ? [{ email: email.toLowerCase() }] : [])
            ]
        });

        if (!dbUser) {
            if (!email) {
                throw new Error('Cannot create user without email');
            }

            console.log('👤 Creating new Apple user:', email);
            dbUser = await User.create({
                name: userName || email.split('@')[0],
                email: email.toLowerCase(),
                appleId: appleId,
                role: 'member',
                nativeLanguage: 'vi',
                level: 'beginner',
                isAppleUser: true
            });
            console.log('✅ Apple user created:', dbUser._id);
        } else {
            // Update appleId if not set
            if (!dbUser.appleId) {
                dbUser.appleId = appleId;
                dbUser.isAppleUser = true;
                await dbUser.save();
            }
            console.log('✅ Existing user found:', dbUser.email);
        }

        // Generate our custom JWT
        const customToken = generateToken({
            userId: dbUser._id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            nativeLanguage: dbUser.nativeLanguage,
            level: dbUser.level
        });

        // Parse return URL from state
        let returnUrl = '/';
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            returnUrl = stateData.returnUrl || '/';
        } catch (e) {
            console.log('Could not parse state:', e);
        }

        // Redirect with token (for web) or return JSON (for API)
        const redirectUrl = `/?token=${customToken}`;

        // Use HTML redirect since Apple uses form_post
        res.setHeader('Content-Type', 'text/html');
        res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
          <script>
            localStorage.setItem('token', '${customToken}');
            window.location.href = '${redirectUrl}';
          </script>
        </head>
        <body>Redirecting...</body>
      </html>
    `);

    } catch (error) {
        console.error('❌ Apple callback error:', error);
        res.redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
}
