// Manual Apple Sign In - Bypass NextAuth completely
// Works by redirecting to Apple OAuth and handling callback manually

export default async function handler(req, res) {
    const clientId = process.env.APPLE_CLIENT_ID;
    const redirectUri = encodeURIComponent('https://papageil.net/api/auth/apple-callback');
    const state = Buffer.from(JSON.stringify({
        returnUrl: req.query.returnUrl || '/',
        timestamp: Date.now()
    })).toString('base64');
    const nonce = 'n-' + Date.now();

    const appleAuthUrl = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code%20id_token&response_mode=form_post&scope=name%20email&state=${state}&nonce=${nonce}`;

    res.redirect(302, appleAuthUrl);
}
