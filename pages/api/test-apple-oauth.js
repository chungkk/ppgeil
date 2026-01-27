// Test Apple OAuth directly - bypassing NextAuth
// DELETE AFTER TESTING

export default async function handler(req, res) {
    const clientId = process.env.APPLE_CLIENT_ID;
    const redirectUri = 'https://papageil.net/api/auth/callback/apple';

    // Build Apple authorization URL manually
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code id_token',
        response_mode: 'form_post',
        scope: 'name email',
        state: 'test-state-123',
        nonce: 'test-nonce-' + Date.now(),
    });

    const appleAuthUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;

    // Return the URL for manual testing
    res.json({
        message: 'Apple OAuth Test',
        clientId,
        redirectUri,
        authUrl: appleAuthUrl,
        instructions: 'Click the authUrl to test Apple OAuth directly'
    });
}
