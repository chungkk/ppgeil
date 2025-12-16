# Quick Start Guide

Get the German Learning mobile app running on your local machine in under 10 minutes.

**Last Updated**: 2024-12-16  
**Prerequisites**: macOS (for iOS development), Node.js 18+, Xcode 15+

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
# Install Node.js (if not installed)
brew install node

# Install Expo CLI globally
npm install -g expo-cli

# Verify installation
expo --version  # Should show 6.x.x
```

### Step 2: Create Project

```bash
# Navigate to repo root
cd "/Users/chungkk/Desktop/GG Driver/code/code new 29.8"

# Create new Expo app
npx create-expo-app@latest german-shadowing-app --template expo-template-blank-typescript

# Navigate into project
cd german-shadowing-app

# Install additional dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install axios swr
npm install @react-native-async-storage/async-storage
npm install expo-secure-store expo-av expo-file-system
npm install react-native-vector-icons
npm install i18next react-i18next
```

### Step 3: Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_APP_NAME=PapaGeil
EOF
```

### Step 4: Start Development Server

```bash
# Start Expo dev server
npm start

# In another terminal, start backend (if running locally)
cd ..  # Back to repo root
npm run dev
```

### Step 5: Run on iOS Simulator

```bash
# Press 'i' in the Expo terminal, or:
npm run ios
```

**Expected Result**: iOS Simulator opens and shows the default Expo app. If you see this, you're ready to start building!

---

## 📁 Project Structure Setup

Create the recommended folder structure:

```bash
cd german-shadowing-app

# Create directory structure
mkdir -p src/{navigation,screens,components,services,context,hooks,types,utils,styles}
mkdir -p src/components/{atoms,molecules,organisms}
mkdir -p src/screens/{Home,Lesson,Dictation,Profile,Auth}
mkdir -p __tests__/{unit,integration,e2e}
mkdir -p assets/{images,fonts}

# Create placeholder files
touch src/navigation/AppNavigator.tsx
touch src/services/api.ts
touch src/services/auth.ts
touch src/context/AuthContext.tsx
touch src/styles/colors.ts
touch src/types/Lesson.ts
touch src/types/User.ts
```

---

## 🔧 Configuration Files

### app.json

Update your `app.json`:

```json
{
  "expo": {
    "name": "PapaGeil",
    "slug": "papageil-german-learning",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.papageil.app",
      "buildNumber": "1",
      "infoPlist": {
        "UIBackgroundModes": ["audio"],
        "NSMicrophoneUsageDescription": "This app needs access to the microphone for pronunciation practice.",
        "NSCameraUsageDescription": "This app needs camera access to scan QR codes."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.papageil.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-av",
      "expo-secure-store",
      "@react-native-async-storage/async-storage"
    ],
    "extra": {
      "apiUrl": process.env.EXPO_PUBLIC_API_URL
    }
  }
}
```

### tsconfig.json

Update `tsconfig.json` for path aliases:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@services/*": ["src/services/*"],
      "@hooks/*": ["src/hooks/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@styles/*": ["src/styles/*"],
      "@context/*": ["src/context/*"],
      "@navigation/*": ["src/navigation/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

---

## 🎨 Initial Code Samples

### src/services/api.ts

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      await SecureStore.deleteItemAsync('auth_token');
      // TODO: Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export default api;
```

### src/types/Lesson.ts

```typescript
export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: Category;
  categorySlug: string;
  audioUrl: string;
  videoUrl?: string;
  thumbnailUrl: string;
  duration: number;
  transcript: TranscriptSegment[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  userProgress?: UserLessonProgress;
  isDownloaded?: boolean;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  translation?: string;
  startTime: number;
  endTime: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

export interface UserLessonProgress {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  playbackPosition: number;
  completionPercentage: number;
  pointsEarned: number;
  accuracyScore?: number;
  attemptsCount: number;
  startedAt?: string;
  completedAt?: string;
  lastAccessedAt: string;
}
```

### App.tsx (Minimal Setup)

```typescript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PapaGeil</Text>
      <Text style={styles.subtitle}>German Learning App</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
```

---

## 🧪 Testing Setup

### Install Testing Dependencies

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
npm install --save-dev jest-expo
```

### jest.config.js

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
};
```

### jest-setup.ts

```typescript
import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-av');
```

### Example Test

Create `__tests__/unit/services/api.test.ts`:

```typescript
import api from '@/services/api';

describe('API Client', () => {
  it('should have correct base URL', () => {
    expect(api.defaults.baseURL).toBeDefined();
  });

  it('should have timeout configured', () => {
    expect(api.defaults.timeout).toBe(10000);
  });
});
```

Run tests:

```bash
npm test
```

---

## 🔌 Connect to Backend

### Option 1: Local Backend (Recommended for Development)

1. Start Next.js backend:
   ```bash
   cd "/Users/chungkk/Desktop/GG Driver/code/code new 29.8"
   npm run dev  # Starts on http://localhost:3000
   ```

2. Update mobile app `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

3. **Important for iOS Simulator**: Use `http://localhost:3000`, NOT `http://127.0.0.1:3000`

### Option 2: Production Backend

```
EXPO_PUBLIC_API_URL=https://papageil.net/api
```

### Test Connection

```typescript
// src/services/__tests__/api-connection.test.ts
import api from '@/services/api';

test('API connection works', async () => {
  const response = await api.get('/lessons?limit=1');
  expect(response.status).toBe(200);
  expect(response.data.lessons).toBeDefined();
});
```

---

## 📱 Debugging Tips

### Common Issues

**Issue**: "Unable to resolve module"  
**Solution**: Clear cache and restart:
```bash
expo start -c
```

**Issue**: iOS simulator shows white screen  
**Solution**: Reload app (Cmd + R in simulator)

**Issue**: API requests fail with network error  
**Solution**: 
- Check backend is running (`curl http://localhost:3000/api/lessons`)
- Check `.env` file has correct `EXPO_PUBLIC_API_URL`
- Restart Expo dev server

### Debug Menu

- iOS Simulator: Cmd + D
- Physical iOS Device: Shake device

### Useful Debug Tools

```bash
# View logs
expo start --clear

# Run with different port
expo start --port 19001

# Check bundle size
npx expo-cli export --dump-sourcemap
```

---

## 🚢 Building for iOS

### Development Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS simulator
eas build --platform ios --profile development-simulator

# Build for physical device (development)
eas build --platform ios --profile development
```

### Production Build

```bash
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

---

## 📚 Next Steps

1. **Implement Navigation**: Set up React Navigation stack and tabs
2. **Create Home Screen**: Lesson browsing with categories
3. **Build Lesson Detail**: Audio player with transcript
4. **Add Authentication**: Login/register screens
5. **Implement Offline**: Download lessons for offline access

**Reference Documentation**:
- [spec.md](./spec.md) - Feature specification
- [data-model.md](./data-model.md) - Data entities
- [contracts/](./contracts/) - API contracts
- [research.md](./research.md) - Technical decisions

---

## 🆘 Getting Help

**Expo Documentation**: https://docs.expo.dev  
**React Navigation**: https://reactnavigation.org  
**React Native**: https://reactnative.dev

**Common Commands**:
```bash
npm start              # Start dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm test               # Run tests
npm run lint           # Lint code
expo doctor            # Check for issues
```

---

**Setup Complete!** 🎉

You should now have a working development environment. Start building by implementing the home screen (lesson list) as defined in User Story 1 of the spec.
