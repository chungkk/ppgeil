# Authentication API

Handles user authentication, registration, and session management.

## Endpoints

### POST /api/auth/register

Create a new user account.

**Authentication**: None required

**Request Body**:
```json
{
  "name": "string",           // 2-50 characters
  "email": "string",          // Valid email format
  "password": "string",       // Min 8 characters
  "nativeLanguage": "vi"      // 'de' | 'vi' | 'en'
}
```

**Response 201**:
```json
{
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "nativeLanguage": "vi",
    "level": "beginner",
    "points": 0,
    "streak": 0,
    "createdAt": "2024-12-16T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_abc123..."
}
```

**Errors**:
- `400 BAD_REQUEST`: Invalid input (email format, password too short)
- `409 CONFLICT`: Email already exists

---

### POST /api/auth/login

Authenticate existing user.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200**:
```json
{
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "nativeLanguage": "vi",
    "level": "beginner",
    "points": 120,
    "streak": 3,
    "lastActivityDate": "2024-12-15T10:00:00Z",
    "preferences": {
      "defaultPlaybackSpeed": 1.0,
      "interfaceLanguage": "vi",
      "theme": "system",
      "autoPlayNext": true
    },
    "stats": {
      "totalLessonsCompleted": 5,
      "totalTimeSpent": 180,
      "averageAccuracy": 85,
      "longestStreak": 5,
      "lessonsThisWeek": 3,
      "lessonsThisMonth": 5
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_abc123..."
}
```

**Errors**:
- `400 BAD_REQUEST`: Missing email or password
- `401 UNAUTHORIZED`: Invalid credentials

---

### GET /api/auth/me

Get current authenticated user's profile.

**Authentication**: Required (Bearer token)

**Response 200**:
```json
{
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "avatarUrl": "https://...",
    "nativeLanguage": "vi",
    "level": "intermediate",
    "points": 1250,
    "streak": 12,
    "lastActivityDate": "2024-12-16T09:30:00Z",
    "preferences": {
      "defaultPlaybackSpeed": 1.25,
      "interfaceLanguage": "vi",
      "theme": "dark",
      "autoPlayNext": false,
      "downloadQuality": "high"
    },
    "stats": {
      "totalLessonsCompleted": 42,
      "totalTimeSpent": 1800,
      "averageAccuracy": 88,
      "longestStreak": 15,
      "lessonsThisWeek": 7,
      "lessonsThisMonth": 28
    },
    "createdAt": "2024-10-01T10:00:00Z",
    "updatedAt": "2024-12-16T09:30:00Z"
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid or expired token

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Authentication**: None required (uses refresh token in body)

**Request Body**:
```json
{
  "refreshToken": "refresh_abc123..."
}
```

**Response 200**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_def456..."
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid or expired refresh token

---

### POST /api/auth/change-password

Change user's password (requires current password).

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"    // Min 8 characters
}
```

**Response 200**:
```json
{
  "message": "Password changed successfully"
}
```

**Errors**:
- `400 BAD_REQUEST`: New password too short
- `401 UNAUTHORIZED`: Invalid current password

---

### POST /api/auth/logout

Invalidate current session token.

**Authentication**: Required (Bearer token)

**Request Body**: None

**Response 200**:
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /api/auth/update-profile

Update user profile information.

**Authentication**: Required (Bearer token)

**Request Body** (all fields optional):
```json
{
  "name": "string",
  "nativeLanguage": "en",
  "level": "intermediate",
  "avatarUrl": "https://...",
  "preferences": {
    "defaultPlaybackSpeed": 1.5,
    "interfaceLanguage": "en",
    "theme": "light",
    "autoPlayNext": false,
    "downloadQuality": "medium"
  }
}
```

**Response 200**:
```json
{
  "user": {
    // Updated user object
  }
}
```

**Errors**:
- `400 BAD_REQUEST`: Invalid field values

---

## OAuth2 / Google Sign-In

### POST /api/auth/[...nextauth]

Handled by NextAuth.js. Mobile app should use the following flow:

1. Open Google OAuth consent screen in WebView/browser
2. User authorizes
3. Receive callback with authorization code
4. Exchange code for token via NextAuth

**Mobile Implementation**:
```typescript
// Use expo-auth-session for Google OAuth
import * as Google from 'expo-auth-session/providers/google';

const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: 'YOUR_EXPO_CLIENT_ID',
  iosClientId: 'YOUR_IOS_CLIENT_ID',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  webClientId: 'YOUR_WEB_CLIENT_ID',
});

// After successful auth, backend handles token generation
```

---

## Token Format

JWT tokens contain:

```json
{
  "userId": "user_123",
  "email": "john@example.com",
  "role": "user",
  "iat": 1702728000,      // Issued at
  "exp": 1702814400       // Expires at (24 hours later)
}
```

**Token Lifetime**:
- Access token: 24 hours
- Refresh token: 30 days

---

## Security Considerations

1. **Password Requirements**: Minimum 8 characters (enforced server-side)
2. **Rate Limiting**: Max 5 login attempts per 15 minutes per IP
3. **Token Storage**: Use SecureStore on mobile (never AsyncStorage)
4. **HTTPS Only**: All auth endpoints require HTTPS in production
5. **CORS**: Mobile app origin must be whitelisted
