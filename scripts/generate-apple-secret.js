const jwt = require('jsonwebtoken');

// ========================================
// CONFIGURATION - Already set for PapaGeil
// ========================================
const CONFIG = {
    teamId: '6CH84XZG3T',        // Apple Developer Team ID
    keyId: '3CF443QR7D',         // Key ID mới
    serviceId: 'net.papageil.auth', // Service ID (APPLE_CLIENT_ID)
};

// ========================================
// PRIVATE KEY - From .p8 file
// ========================================
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgEhR2wiJ3jlIyN3Zh
BH9XAehG6vcN9x1Ub3+1WjvJndOgCgYIKoZIzj0DAQehRANCAAQzzzbmO6wdP3cB
dyKT+I6xphMdQrZp8nfWG1FCmp3TkGQC+SU4/PiDCPt+pqJjto4FmRUgSBPIPIxS
9MB1nQFw
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
