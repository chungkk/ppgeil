# Phase 0: Technical Research

**Feature**: Native Mobile App for German Language Learning  
**Date**: 2024-12-16  
**Status**: Phase 0 Complete

## Research Questions

This document resolves all NEEDS CLARIFICATION items from the Technical Context section of [plan.md](./plan.md).

---

## 1. Language/Framework Choice

### Question
Should we use JavaScript/TypeScript with React Native or native Swift for iOS?

### Research Findings

#### Option A: React Native (Cross-platform)
**Pros**:
- ✅ Code reusability with existing React/Next.js patterns
- ✅ Faster development (single codebase for iOS + future Android)
- ✅ Large ecosystem (npm packages, community)
- ✅ Hot reload for faster iteration
- ✅ Team already knows JavaScript/TypeScript
- ✅ Can share types/utilities with web codebase

**Cons**:
- ❌ Slightly larger app size (~40-50MB base)
- ❌ Performance overhead for complex animations
- ❌ Requires bridge for native modules
- ❌ Debugging can be complex

#### Option B: Native Swift (iOS-only)
**Pros**:
- ✅ Best performance (native compilation)
- ✅ Smaller app size (~20-30MB)
- ✅ Full access to iOS APIs
- ✅ Better SwiftUI/UIKit integration
- ✅ Excellent Xcode tooling

**Cons**:
- ❌ Steep learning curve (new language/framework)
- ❌ Separate codebase from web
- ❌ No code sharing with existing project
- ❌ Future Android app requires complete rewrite
- ❌ Longer development time

### Decision

**✅ React Native with TypeScript**

### Rationale

1. **Existing codebase**: Project already uses React, Next.js, and TypeScript. Team familiarity reduces risk and training time.
2. **Cross-platform potential**: User said "iOS" initially, but future Android support is likely valuable. React Native enables this with 80%+ code reuse.
3. **Development speed**: Given the 16 screens and 60+ components needed, React Native's hot reload and component reusability will significantly accelerate development.
4. **Performance acceptable**: For this app's use case (audio playback, text display, forms), React Native performance is more than sufficient. Critical path (audio playback) can use native modules if needed.
5. **Team efficiency**: No need to hire Swift developers or split team across two codebases.

### Alternatives Considered

- **Flutter**: Rejected because team has no Dart experience and React Native has better integration with existing Node.js backend
- **Ionic/Cordova**: Rejected because pure WebView approach has worse performance than React Native
- **Native Swift + React Native views**: Overly complex for this project's scope

---

## 2. React Native Framework Choice

### Question
Should we use Expo (managed workflow) or Bare React Native?

### Research Findings

#### Option A: Expo (Managed Workflow)
**Pros**:
- ✅ Zero native code configuration needed
- ✅ Built-in OTA (over-the-air) updates
- ✅ EAS Build (cloud build service)
- ✅ Extensive SDK (camera, audio, notifications, etc.)
- ✅ Faster initial setup (5 minutes vs 2 hours)
- ✅ Easy testing with Expo Go app
- ✅ Can eject to bare workflow if needed

**Cons**:
- ❌ Larger initial app size (~50-60MB)
- ❌ Limited to Expo-supported native modules
- ❌ Requires Expo account for builds
- ❌ Less control over native build process

#### Option B: Bare React Native
**Pros**:
- ✅ Full control over native code
- ✅ Smaller app size (~35-45MB)
- ✅ Can use any native module
- ✅ Direct Xcode/Android Studio access

**Cons**:
- ❌ Complex initial setup
- ❌ Manual native dependency management
- ❌ No built-in OTA updates
- ❌ More maintenance overhead
- ❌ Requires macOS for iOS builds

### Decision

**✅ Expo (Managed Workflow)**

### Rationale

1. **Rapid prototyping**: Expo allows us to get a working app in hours, not days. Critical for validating the migration approach early.
2. **Built-in features**: Expo SDK includes everything needed for this app:
   - `expo-av`: Audio/video playback ✅
   - `expo-file-system`: Offline downloads ✅
   - `expo-secure-store`: Token storage ✅
   - `expo-font`: Custom fonts ✅
   - `expo-notifications`: Push notifications ✅
3. **OTA updates**: Can fix bugs and deploy updates without App Store review (for JS changes).
4. **EAS Build**: Cloud build service means no need for macOS for every developer (can build from CI/CD).
5. **Future-proof**: If we need custom native modules later, we can run `expo eject` to migrate to bare workflow without rewriting code.
6. **Team experience**: Lower barrier to entry for team members unfamiliar with Xcode/native development.

### Alternatives Considered

- **Expo bare workflow**: Middle ground but adds complexity without significant benefits for this project
- **React Native CLI**: More control but unnecessary complexity for app requirements

---

## 3. Testing Strategy

### Question
What testing framework and approach should we use?

### Research Findings

#### Testing Layers

**Unit Tests** (70% of tests)
- **Framework**: Jest (built-in with React Native/Expo)
- **Target**: Utils, hooks, services, business logic
- **Coverage goal**: >80% for critical paths

**Component Tests** (20% of tests)
- **Framework**: React Native Testing Library
- **Target**: Individual UI components (atoms, molecules)
- **Focus**: Accessibility, interactions, state changes

**Integration Tests** (8% of tests)
- **Framework**: React Native Testing Library
- **Target**: Screen flows (navigation, API integration)
- **Focus**: User journeys from spec

**E2E Tests** (2% of tests)
- **Framework**: Detox
- **Target**: Critical user paths (P1 user stories)
- **Focus**: Login → Browse → Play lesson → Complete

#### Best Practices from Research

1. **Test-driven for critical flows**: Write tests for P1 user stories before implementation
2. **Mock API calls**: Use MSW (Mock Service Worker) or similar for consistent test data
3. **Accessibility testing**: Use `@testing-library/react-native` accessibility queries
4. **Snapshot tests**: Minimal use (only for stable, complex UI)
5. **Performance tests**: Use React Native Performance monitoring for key metrics

### Decision

**✅ Jest + React Native Testing Library + Detox (selective)**

### Rationale

1. **Standard stack**: Jest and RTL are industry standard for React Native
2. **Fast feedback**: Unit tests run in <1s, giving quick feedback during development
3. **Accessibility-first**: RTL encourages testing from user perspective
4. **Selective E2E**: Only test critical P1 paths with Detox (expensive to maintain)
5. **CI-friendly**: All tools integrate well with GitHub Actions or similar

### Test Priorities (from Spec)

**Must test** (P1):
- [ ] User can browse lessons (User Story 1)
- [ ] User can play audio with synchronized transcript (User Story 2)
- [ ] User can complete a lesson and earn points (User Story 2)

**Should test** (P2):
- [ ] Dictation mode validates input correctly (User Story 3)
- [ ] Dictionary lookup returns results (User Story 4)

**Nice to test** (P3):
- [ ] Leaderboard displays rankings (User Story 5)
- [ ] Offline lessons work without network (User Story 6)

---

## 4. Technology Stack Best Practices

### Navigation
**Decision**: React Navigation 6.x (latest)

**Rationale**:
- De facto standard for React Native navigation
- Supports stack, tabs, drawers, modals
- Excellent TypeScript support
- Active maintenance and large community

**Structure**:
```typescript
AppNavigator (Root)
├── AuthStack (if not logged in)
│   ├── Login
│   └── Register
└── MainTabs (if logged in)
    ├── HomeStack
    │   ├── Home (lesson list)
    │   └── LessonDetail
    ├── DictationStack
    └── ProfileStack
```

### Audio Playback
**Decision**: `expo-av` for audio, `react-native-video` for video (if needed)

**Rationale**:
- `expo-av` handles background audio, playback speed, seek
- Well-documented and maintained
- Works with Expo managed workflow
- Supports required features:
  - Playback speed control ✅
  - Seek to position ✅
  - Background playback ✅
  - Audio focus handling ✅

**Alternative considered**: `react-native-track-player` (rejected because requires bare workflow)

### State Management
**Decision**: React Context + SWR for data fetching

**Rationale**:
- Context is built-in, no extra dependencies
- SWR provides caching, revalidation, optimistic updates
- Lightweight compared to Redux/MobX
- Sufficient for app's state complexity
- Team already uses SWR in Next.js web app

**Contexts needed**:
- `AuthContext`: User session, login/logout
- `ThemeContext`: Dark/light mode
- `LanguageContext`: i18n (de/vi/en)
- `AudioContext`: Playback state (optional, may use local state)

### Storage
**Decision**:
- `@react-native-async-storage/async-storage`: Preferences, settings
- `expo-secure-store`: Auth tokens, sensitive data
- `expo-file-system`: Downloaded lesson files (audio, transcripts)
- Consider `WatermelonDB` if offline data gets complex (unlikely for MVP)

### UI Components
**Decision**: Custom components using React Native primitives + `react-native-reanimated` for animations

**Rationale**:
- Full control over design
- Smaller bundle size than UI libraries (React Native Paper, NativeBase)
- Better performance with custom components
- Design system approach (atoms/molecules/organisms)

**Key libraries**:
- `react-native-reanimated`: Smooth animations (60 FPS)
- `react-native-gesture-handler`: Touch gestures
- `react-native-vector-icons`: Icons (Material Icons)

### Internationalization
**Decision**: `i18next` + `react-i18next` (already used in web app)

**Rationale**:
- Consistency with existing web app
- Can potentially share translation files
- Robust and well-maintained
- Supports language detection, lazy loading

---

## 5. Development Workflow

### Local Development
```bash
# Install Expo CLI
npm install -g expo-cli

# Create project
npx create-expo-app german-shadowing-app --template expo-template-blank-typescript

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on physical device via Expo Go app
# (Scan QR code from terminal)
```

### Testing Workflow
```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests (requires simulator/device)
npm run test:e2e

# Run specific test file
npm test -- LoginScreen.test.tsx
```

### Build & Deploy
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS build
eas build:configure

# Build for iOS (development)
eas build --platform ios --profile development

# Build for iOS (production)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### CI/CD Integration
```yaml
# .github/workflows/mobile-ci.yml
name: Mobile CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run lint

  build:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx expo-cli export
      - run: eas build --platform ios --profile production --non-interactive
```

---

## 6. API Integration Strategy

### API Client Setup

**Decision**: `axios` with interceptors for auth and error handling

```typescript
// src/services/api.ts
import axios from 'axios';
import { getSecureItem } from './storage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://papageil.net/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
api.interceptors.request.use(async (config) => {
  const token = await getSecureItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (redirect to login)
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Existing API Endpoints to Consume

From existing Next.js backend (`pages/api/`):

**Authentication** (7 endpoints):
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/change-password` - Update password
- `POST /api/auth/[...nextauth]` - OAuth (Google)

**Lessons** (8 endpoints):
- `GET /api/lessons` - List lessons (with filters)
- `GET /api/lessons/[id]` - Get lesson detail
- `POST /api/lessons/[id]/view` - Increment view count
- `GET /api/article-categories` - List categories
- (4 more lesson management endpoints)

**User Progress** (5 endpoints):
- `GET /api/user/points` - Get user points
- `POST /api/user/points` - Update points
- `GET /api/user/study-stats` - Get study statistics
- `GET /api/user/srs-progress` - Spaced repetition progress
- `POST /api/progress` - Save lesson progress

**Leaderboard** (7 endpoints):
- `GET /api/leaderboard` - Get rankings
- `GET /api/leaderboard/weekly` - Weekly rankings
- `GET /api/leaderboard/monthly` - Monthly rankings
- `GET /api/leaderboard/alltime` - All-time rankings
- `GET /api/leaderboard/user-rank` - User's rank
- `GET /api/leaderboard/badges` - User achievements
- `GET /api/leaderboard/leagues` - League standings

**Dictionary** (1 endpoint):
- `POST /api/dictionary` - Look up word definition

**Additional** (44 endpoints):
- Notifications, transcription, YouTube integration, etc.

### Data Fetching Pattern

**Decision**: Use SWR for GET requests, axios directly for mutations

```typescript
// Example: Fetch lessons
import useSWR from 'swr';
import api from '@/services/api';

export function useLessons(categorySlug?: string, difficulty?: string) {
  const params = new URLSearchParams();
  if (categorySlug) params.append('category', categorySlug);
  if (difficulty) params.append('difficulty', difficulty);

  const { data, error, mutate } = useSWR(
    `/lessons?${params.toString()}`,
    (url) => api.get(url).then((res) => res.data)
  );

  return {
    lessons: data?.lessons || [],
    total: data?.total || 0,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}
```

---

## 7. Performance Optimization Strategies

### Success Criteria from Spec
- App launch < 3s ✅
- Lesson load < 2s ✅
- Audio latency < 100ms ✅
- 60 FPS scrolling ✅
- Dictionary lookup < 2s ✅

### Optimization Techniques

**App Launch Time**:
- Use code splitting with `React.lazy()` for non-critical screens
- Defer initialization of heavy libraries (audio, analytics)
- Cache frequently accessed data in AsyncStorage
- Use Hermes JavaScript engine (enabled by default in Expo)

**Lesson Loading**:
- Prefetch lesson data when user taps (optimistic loading)
- Cache lesson transcripts locally
- Progressive loading: Show UI → Load audio in background
- Use `react-native-fast-image` for image caching

**Audio Playback**:
- Use native audio module (`expo-av`)
- Preload next sentence audio while current plays
- Buffer management for offline playback

**Scrolling Performance**:
- Use `FlatList` with `getItemLayout` for fixed-height items
- Implement `windowSize` and `maxToRenderPerBatch` optimizations
- Avoid expensive operations in render (memoization)
- Use `react-native-reanimated` for 60 FPS animations

**Bundle Size**:
- Use Expo's built-in tree shaking
- Avoid importing entire libraries (e.g., `import { Button } from 'lib'` not `import lib from 'lib'`)
- Use vector icons instead of image assets
- Compress images with `expo-optimize`

---

## Summary of Decisions

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Language** | TypeScript with React Native | Team familiarity, code sharing with web app, cross-platform support |
| **Framework** | Expo (Managed Workflow) | Rapid development, built-in features, OTA updates, can eject if needed |
| **Navigation** | React Navigation 6.x | Industry standard, excellent TypeScript support, active maintenance |
| **State Management** | React Context + SWR | Lightweight, sufficient complexity, consistency with web app |
| **Audio** | expo-av | Built-in, handles all requirements (speed, seek, background) |
| **Storage** | AsyncStorage + SecureStore + FileSystem | Native, secure, handles all data types (prefs, tokens, files) |
| **Testing** | Jest + RTL + Detox (selective) | Industry standard, fast feedback, accessibility-first approach |
| **API Client** | axios with interceptors | Simple, robust, handles auth and errors centrally |
| **UI Components** | Custom (React Native primitives) | Full control, smaller bundle, better performance than UI libraries |
| **i18n** | i18next + react-i18next | Consistency with web app, robust, well-maintained |
| **Icons** | react-native-vector-icons | Lightweight, extensive icon sets, customizable |
| **Animations** | react-native-reanimated | 60 FPS guaranteed, runs on UI thread, smooth gestures |

---

## Next Steps

With all technical decisions resolved, we can proceed to:

1. ✅ **Phase 1**: Design data models and API contracts ([data-model.md](./data-model.md))
2. ✅ **Phase 1**: Document quickstart guide ([quickstart.md](./quickstart.md))
3. → **Phase 2**: Break down into implementation tasks ([tasks.md](./tasks.md))

---

**Research Complete**: 2024-12-16  
**All NEEDS CLARIFICATION resolved**: ✅  
**Ready for Phase 1**: Yes
