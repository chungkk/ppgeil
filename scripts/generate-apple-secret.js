const jwt = require('jsonwebtoken');

// ========================================
// CONFIGURATION - Already set for PapaGeil
// ========================================
const CONFIG = {
    teamId: '6CH84XZG3T',        // Apple Developer Team ID
    keyId: 'QH6RVHLG92',         // Key ID từ Apple Console
    serviceId: 'papageil.net.auth', // Service ID (APPLE_CLIENT_ID)
};

// ========================================
// PRIVATE KEY - From .p8 file (Key ID: QH6RVHLG92)
// ========================================
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgGF1exs5Dhish4FTV
Zs9ddOiR3kzvTmfRhudiuvRN1jygCgYIKoZIzj0DAQehRANCAASoXrFt9YoeKQKe
tu3Y5JKXoXacb8ror8Zv+tct7iqMbzZR8jX42quEyj0b4hO/5V6OknqpDG0Lev92
c3L+SQY6
-----END PRIVATE KEY-----`;

function generateClientSecret() {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 60 * 60 * 24 * 180; // 180 days (Maximum allowed)

    const payload = {
        iss: CONFIG.teamId,
        iat: now,
        exp: now + expiresIn,
        aud: 'https://appleid.apple.com',
        sub: CONFIG.serviceId,
    };

    const clientSecret = jwt.sign(payload, PRIVATE_KEY, {
        algorithm: 'ES256',
        header: {
            alg: 'ES256',
            kid: CONFIG.keyId,
        },
    });

    console.log('');
    console.log('✅ Apple Client Secret generated successfully!');
    console.log('');
    console.log('📋 Copy and paste to .env.local:');
    console.log('');
    console.log('APPLE_CLIENT_ID=' + CONFIG.serviceId);
    console.log('');
    console.log('APPLE_CLIENT_SECRET=' + clientSecret);
    console.log('');

    // Verify the token
    const decoded = jwt.decode(clientSecret);
    console.log('🔍 Token info:');
    console.log('   Subject:', decoded.sub);
    console.log('   Issuer:', decoded.iss);
    console.log('   Expires:', new Date(decoded.exp * 1000).toISOString());
    console.log('');
}

generateClientSecret();
