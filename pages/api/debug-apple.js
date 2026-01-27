// Debug Apple Config - DELETE AFTER TESTING
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    const clientId = process.env.APPLE_CLIENT_ID;
    const clientSecret = process.env.APPLE_CLIENT_SECRET;

    let secretInfo = null;
    let error = null;

    try {
        // Decode the JWT without verification to see what's inside
        secretInfo = jwt.decode(clientSecret, { complete: true });
    } catch (e) {
        error = e.message;
    }

    res.json({
        clientId,
        secretLength: clientSecret?.length || 0,
        secretPreview: clientSecret?.substring(0, 50) + '...',
        secretInfo: secretInfo ? {
            header: secretInfo.header,
            payload: {
                iss: secretInfo.payload.iss,
                sub: secretInfo.payload.sub,
                aud: secretInfo.payload.aud,
                iat: new Date(secretInfo.payload.iat * 1000).toISOString(),
                exp: new Date(secretInfo.payload.exp * 1000).toISOString(),
            }
        } : null,
        error,
        expected: {
            sub_should_be: clientId,
            aud_should_be: 'https://appleid.apple.com'
        }
    });
}
