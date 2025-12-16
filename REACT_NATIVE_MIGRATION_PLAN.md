# 📱 LỘ TRÌNH MIGRATION: Next.js → React Native
## German Shadowing App (PapaGeil)

---

## 🎯 TỔNG QUAN DỰ ÁN

### Ứng dụng hiện tại (Next.js + Capacitor iOS)
- **Tên:** PapaGeil - German Shadowing App
- **Stack:** Next.js 15, React 19, MongoDB, NextAuth, Capacitor 8
- **Tính năng chính:**
  - 📚 Học tiếng Đức qua YouTube videos
  - 🎤 Shadowing (lặp lại theo audio)
  - ✍️ Dictation (chính tả)
  - 📖 Dictionary tích hợp
  - 🏆 Leaderboard & gamification
  - 👤 User authentication (email + Google OAuth)
  - 🌍 i18n (German, Vietnamese, English)

### Mục tiêu Migration
✅ **Native mobile app** với hiệu năng cao  
✅ **Offline-first** architecture  
✅ **Native UX/UI** tốt hơn web wrapper  
✅ **Tối ưu audio/video playback**  
✅ **Giữ nguyên backend API** (Next.js API routes)

---

## 📊 PHÂN TÍCH CHI TIẾT

### 1. 🗂️ Cấu trúc Pages (88 files)
```
pages/
├── index.js                     → Home screen (main lesson list)
├── [lessonId].js                → Lesson detail (shadowing mode)
├── daily-phrase.js              → Daily phrase screen
├── dashboard/                   → User dashboard
├── dictation/[lessonId].js      → Dictation mode
├── practice/[lessonId]/         → Practice modes (read, listen, write, speak)
├── profile/                     → User profile & settings
├── admin/dashboard/             → Admin panel
├── auth/                        → Login/register
├── leben-in-deutschland/        → Citizenship test module
├── city-builder.js              → Gamification feature
└── api/                         → **72 API routes** (giữ nguyên backend)
```

**Migration Strategy:**
- ✅ Giữ nguyên **72 API routes** làm backend server
- 🔄 Chuyển **16 pages UI** sang React Native screens
- 🗺️ Next.js pages → React Navigation (Stack + Tab navigator)

### 2. 🧩 Components (60+ files)
```
components/
├── LessonCard.js                → Lesson item in list
├── DictionaryPopup.js           → Modal dictionary
├── VoiceInputButton.js          → Speech recognition
├── Header.js                    → Top navigation
├── BottomNavigation.js          → Tab bar
├── dictation/                   → 11 dictation components
├── leaderboard/                 → 7 leaderboard components
└── admin/                       → 7 admin components
```

**Migration Mapping:**
| Web Component | React Native Alternative |
|--------------|--------------------------|
| `<div>`, `<button>` | `<View>`, `<TouchableOpacity>` |
| CSS modules | StyleSheet API |
| Next Image | React Native Image / FastImage |
| react-icons | react-native-vector-icons |
| HTML5 audio/video | react-native-track-player / expo-av |
| localStorage | AsyncStorage / SecureStore |

### 3. 🔐 Authentication & Context
```
context/
├── AuthContext.js               → NextAuth + JWT (cần refactor)
├── LanguageContext.js           → i18n (tương thích)
├── ThemeContext.js              → Dark/light mode (OK)
└── NotificationContext.js       → In-app notifications (OK)
```

**Changes Needed:**
- 🔄 Replace NextAuth → Custom auth flow
- 🔄 Store tokens in SecureStore (không dùng localStorage)
- ✅ Giữ nguyên Context API pattern

### 4. 📦 Dependencies Analysis

#### ❌ Không tương thích (cần thay thế)
```json
"next": "^15.5.9",                    → React Navigation
"next-auth": "^4.24.13",              → Custom auth flow
"react-dom": "^19.2.3",               → react-native
"@distube/ytdl-core": "^4.16.12",     → Streaming từ API
"youtubei.js": "^16.0.1",             → Backend xử lý
"formidable": "^3.5.4",               → react-native-fs + multipart
"@capacitor/*": "^8.0.0",             → Không cần (native RN)
```

#### ✅ Tương thích (giữ nguyên)
```json
"react": "^19.2.3",                   → OK
"react-i18next": "^16.3.3",           → OK
"react-icons": "^5.5.0",              → Đổi sang vector-icons
"swr": "^2.3.6",                      → OK (data fetching)
"react-toastify": "^11.0.5",          → Đổi sang react-native-toast
"mongodb/mongoose": "^8.19.2",        → Backend only
"openai": "^6.7.0",                   → Backend only
"bcryptjs": "^3.0.2",                 → Backend only
"jsonwebtoken": "^9.0.2",             → Backend only
```

#### 🆕 Cần thêm (React Native)
```bash
# Core
react-native
react-native-web (optional, for web)

# Navigation
@react-navigation/native
@react-navigation/stack
@react-navigation/bottom-tabs
react-native-screens
react-native-safe-area-context

# UI/UX
react-native-vector-icons
react-native-gesture-handler
react-native-reanimated
react-native-toast-message

# Audio/Video
react-native-track-player
react-native-video

# Storage
@react-native-async-storage/async-storage
react-native-secure-storage

# Network
@react-native-community/netinfo
axios (hoặc fetch native)

# Speech/Recording
@react-native-voice/voice
react-native-audio-recorder-player

# i18n
i18next
react-i18next (đã có)

# Image
react-native-fast-image

# Development
react-native-dotenv
```

---

## 🗓️ LỘ TRÌNH THỰC HIỆN (3-4 tháng)

### ✅ Phase 0: Preparation (Week 1-2)
- [x] ✅ Backup code hiện tại
- [ ] Setup React Native project (Expo or bare React Native)
- [ ] Quyết định Expo vs Bare RN
- [ ] Setup folder structure
- [ ] Configure ESLint, TypeScript (optional)
- [ ] Setup CI/CD pipeline

**Deliverable:** Empty RN app có thể build được trên iOS/Android

---

### 🏗️ Phase 1: Core Infrastructure (Week 3-5)

#### 1.1 Navigation Setup
```
src/
├── navigation/
│   ├── AppNavigator.js          → Root navigator
│   ├── AuthStack.js             → Login/register flow
│   ├── MainTabs.js              → Bottom tabs (Home, Daily, Profile)
│   ├── LessonStack.js           → Lesson detail screens
│   └── linking.js               → Deep linking config
```

#### 1.2 Authentication
- [ ] Custom auth flow (login, register, logout)
- [ ] Token storage (SecureStore)
- [ ] API interceptor for auth headers
- [ ] Protected routes HOC

#### 1.3 State Management
- [ ] Port AuthContext.js
- [ ] Port ThemeContext.js
- [ ] Port LanguageContext.js
- [ ] Setup SWR for data fetching

#### 1.4 API Client
```javascript
// src/services/api.js
import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: 'https://your-nextjs-backend.com/api', // Next.js API server
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Deliverable:** Login/logout flow hoạt động, có thể gọi API

---

### 📱 Phase 2: Core Screens (Week 6-9)

#### 2.1 Home Screen (Priority 1)
```
src/screens/Home/
├── HomeScreen.js
├── LessonCard.js
├── CategorySection.js
└── DifficultyFilter.js
```
**Features:**
- Lesson list by categories
- Search & filters
- Pull to refresh
- Infinite scroll

#### 2.2 Lesson Detail (Priority 1)
```
src/screens/Lesson/
├── LessonDetailScreen.js
├── VideoPlayer.js
├── AudioPlayer.js
├── TranscriptView.js
└── ProgressBar.js
```
**Features:**
- Video/audio playback
- Shadowing mode
- Transcript synchronization
- Playback speed control

#### 2.3 Dictation Mode (Priority 2)
```
src/screens/Dictation/
├── DictationScreen.js
├── FillBlanksMode.js
├── FullSentenceMode.js
├── VoiceInput.js
└── Results.js
```
**Features:**
- Text input
- Voice recognition
- Real-time validation
- Score calculation

#### 2.4 Profile & Settings (Priority 2)
```
src/screens/Profile/
├── ProfileScreen.js
├── SettingsScreen.js
├── StatsCard.js
└── ProgressChart.js
```

#### 2.5 Auth Screens (Priority 1)
```
src/screens/Auth/
├── LoginScreen.js
├── RegisterScreen.js
└── ForgotPasswordScreen.js
```

**Deliverable:** Ứng dụng có thể học lesson cơ bản

---

### 🎨 Phase 3: UI Components Library (Week 10-11)

#### Tạo design system
```
src/components/
├── atoms/
│   ├── Button.js
│   ├── Input.js
│   ├── Card.js
│   └── Avatar.js
├── molecules/
│   ├── SearchBar.js
│   ├── LessonCard.js
│   └── StatCard.js
└── organisms/
    ├── Header.js
    ├── BottomNav.js
    └── DictionaryModal.js
```

**Design System:**
- Spacing: 4, 8, 12, 16, 24, 32, 48px
- Colors: Primary, secondary, text, background (light/dark)
- Typography: Font families, sizes, weights
- Shadows & borders

**Deliverable:** Reusable component library

---

### 🎤 Phase 4: Advanced Features (Week 12-15)

#### 4.1 Audio/Video Playback
- [ ] Integrate react-native-track-player
- [ ] Background audio support
- [ ] Playback speed control
- [ ] Audio focus handling

#### 4.2 Speech Recognition
- [ ] Integrate @react-native-voice/voice
- [ ] Pronunciation scoring (API call)
- [ ] Real-time feedback

#### 4.3 Dictionary
- [ ] Modal popup
- [ ] Word lookup
- [ ] Save to vocabulary list
- [ ] Offline support

#### 4.4 Offline Mode
- [ ] Download lessons
- [ ] Cache audio/video
- [ ] Sync progress when online

#### 4.5 Leaderboard
- [ ] Weekly/monthly rankings
- [ ] User stats
- [ ] Achievement badges

**Deliverable:** Full-featured app

---

### 🧪 Phase 5: Testing & Polish (Week 16-18)

#### Testing
- [ ] Unit tests (Jest)
- [ ] Integration tests
- [ ] E2E tests (Detox)
- [ ] Manual QA on devices

#### Performance
- [ ] Image optimization (FastImage)
- [ ] Code splitting
- [ ] Memory leak detection
- [ ] Bundle size optimization

#### Accessibility
- [ ] Screen reader support
- [ ] Keyboard navigation
- [ ] High contrast mode

**Deliverable:** Production-ready app

---

### 🚀 Phase 6: Deployment (Week 19-20)

#### iOS
- [ ] Apple Developer account
- [ ] App Store assets (screenshots, description)
- [ ] TestFlight beta
- [ ] App Store submission

#### Android
- [ ] Google Play account
- [ ] Play Store assets
- [ ] Internal testing
- [ ] Production release

**Deliverable:** App live trên stores

---

## 🏗️ PROJECT STRUCTURE (React Native)

```
react-native-german-app/
├── android/                      # Android native code
├── ios/                          # iOS native code
├── src/
│   ├── navigation/               # Navigation config
│   │   ├── AppNavigator.js
│   │   ├── AuthStack.js
│   │   └── MainTabs.js
│   ├── screens/                  # All screens
│   │   ├── Home/
│   │   ├── Lesson/
│   │   ├── Dictation/
│   │   ├── Profile/
│   │   └── Auth/
│   ├── components/               # Reusable components
│   │   ├── atoms/
│   │   ├── molecules/
│   │   └── organisms/
│   ├── context/                  # React Context
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   └── LanguageContext.js
│   ├── services/                 # API, storage, etc.
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── storage.js
│   │   └── audio.js
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.js
│   │   ├── useLessons.js
│   │   └── useAudioPlayer.js
│   ├── utils/                    # Helpers
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validation.js
│   ├── styles/                   # Global styles
│   │   ├── colors.js
│   │   ├── typography.js
│   │   └── spacing.js
│   ├── assets/                   # Images, fonts, etc.
│   │   ├── images/
│   │   ├── fonts/
│   │   └── locales/
│   └── App.js                    # Root component
├── .env                          # Environment variables
├── app.json                      # App config
├── package.json
└── README.md
```

---

## 🎯 TECH STACK QUYẾT ĐỊNH

### Lựa chọn 1: **Expo (Recommended cho project này)**
✅ **Pros:**
- Setup nhanh, ít config
- EAS Build (cloud build service)
- OTA updates
- Expo SDK đầy đủ (camera, audio, notifications...)
- Developer experience tốt
- Dễ dàng eject nếu cần

❌ **Cons:**
- Bundle size lớn hơn
- Giới hạn một số native modules

### Lựa chọn 2: Bare React Native
✅ **Pros:**
- Full control native code
- Bundle size nhỏ hơn
- Tùy chỉnh native modules

❌ **Cons:**
- Setup phức tạp hơn
- Phải tự quản lý native dependencies
- Không có OTA updates built-in

### 🏆 **RECOMMENDED: Expo**
Vì project này không cần custom native code nhiều, Expo là lựa chọn tốt nhất.

---

## 💰 CHI PHÍ & NGUỒN LỰC

### Team Recommended
- **1 React Native Developer** (senior): Full-time 3-4 tháng
- **1 Backend Developer** (part-time): Maintain Next.js API
- **1 UI/UX Designer** (part-time): Thiết kế screens
- **1 QA Tester** (part-time): Testing cuối project

### Developer Accounts
- **Apple Developer**: $99/năm
- **Google Play Console**: $25 (1 lần)

### Hosting (Backend)
- **Next.js API Server**: Vercel/Railway ($0-50/tháng)
- **MongoDB Atlas**: $0-57/tháng (M10 cluster)

### Third-party Services
- **OpenAI API**: ~$20-50/tháng (tùy usage)
- **Firebase** (optional): Push notifications, analytics

**Total estimated:** $5,000 - $15,000 (nếu thuê developer)

---

## ⚠️ CHALLENGES & RISKS

### 1. Audio/Video Playback
**Problem:** Web audio API khác native playback  
**Solution:** react-native-track-player cho audio, react-native-video cho video

### 2. Speech Recognition
**Problem:** Web Speech API không có trên mobile  
**Solution:** @react-native-voice/voice + cloud API (Google Speech)

### 3. Authentication
**Problem:** NextAuth không support React Native  
**Solution:** Custom auth flow + JWT tokens

### 4. YouTube Integration
**Problem:** Không thể embed YouTube player native  
**Solution:** 
- Option A: WebView (dễ nhưng performance kém)
- Option B: Streaming qua API (tốt hơn)

### 5. Offline Support
**Problem:** Caching audio/video files lớn  
**Solution:** 
- Selective download
- Streaming online, cache offline
- Clear cache policy

### 6. Learning Curve
**Problem:** Team quen Next.js chưa biết React Native  
**Solution:** 
- Training 1-2 tuần
- Follow React Native docs
- Join communities (Discord, Reddit)

---

## 📈 SUCCESS METRICS

### Technical KPIs
- [ ] App startup time < 3s
- [ ] Screen transition < 300ms
- [ ] Audio playback latency < 100ms
- [ ] Crash-free rate > 99.5%
- [ ] App size < 50MB (Android), < 80MB (iOS)

### Business KPIs
- [ ] Migration completed in 4 months
- [ ] 80% feature parity with web app
- [ ] User retention rate > 60%
- [ ] App Store rating > 4.5 stars

---

## 📚 RESOURCES & LEARNING

### Documentation
- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)

### Communities
- React Native Discord
- r/reactnative (Reddit)
- Stack Overflow

### Courses (Optional)
- "React Native - The Practical Guide" (Udemy)
- "Complete React Native" (Zero to Mastery)

---

## 🎯 NEXT STEPS

### Quyết định ngay bây giờ:
1. ✅ Backup done
2. ⏳ **Chọn Expo hay Bare RN?** → Recommend: **Expo**
3. ⏳ **Timeline:** 3 tháng hay 4 tháng?
4. ⏳ **Team size:** 1 người hay nhiều người?
5. ⏳ **Backend:** Giữ nguyên Next.js API hay migrate?

### Sau khi quyết định:
```bash
# Step 1: Initialize React Native project
npx create-expo-app@latest german-shadowing-app
cd german-shadowing-app

# Step 2: Install core dependencies
npx expo install react-navigation @react-navigation/native @react-navigation/stack

# Step 3: Setup folder structure
mkdir -p src/{navigation,screens,components,context,services,hooks,utils,styles,assets}

# Step 4: Start development
npm start
```

---

## 📝 NOTES

- **Backend API:** Giữ nguyên Next.js, chỉ cần deploy như API server
- **Data Migration:** Không cần, MongoDB giữ nguyên
- **Users:** Giữ nguyên database, user không mất data
- **Phasing:** Có thể chạy song song web + mobile app

---

**Created:** 2024-12-16  
**Author:** Migration Planning Team  
**Status:** ✅ Ready for Review  
**Next:** Get approval to start Phase 0
