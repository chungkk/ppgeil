# Implementation Plan: Native Mobile App for German Language Learning

**Branch**: `001-react-native-migration` | **Date**: 2024-12-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-react-native-migration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This plan implements a native iOS mobile application for German language learning that delivers shadowing, dictation, and vocabulary practice experiences. The app will be built as a standalone mobile client that consumes the existing Next.js backend API (preserving all 72 API routes). Primary features include lesson browsing, audio playback with synchronized transcripts, dictation mode with real-time feedback, vocabulary lookup, progress tracking with gamification, offline lesson downloads, and multi-language support.

## Technical Context

**Language/Version**: NEEDS CLARIFICATION - JavaScript/TypeScript (React Native) or Swift (native iOS)  
**Primary Dependencies**: NEEDS CLARIFICATION - Framework choice (Expo vs Bare React Native vs Swift UIKit)  
**Storage**: AsyncStorage for preferences, SQLite or Realm for offline data, SecureStore for tokens  
**Testing**: NEEDS CLARIFICATION - Jest + React Native Testing Library or XCTest  
**Target Platform**: iOS 14+ (iPhone and iPad)  
**Project Type**: Mobile (iOS native or cross-platform)  
**Performance Goals**: <3s app launch, <2s lesson load, <100ms audio latency, 60 FPS UI  
**Constraints**: <80MB app size, <50MB/hour data usage, offline-capable, 99.5% crash-free rate  
**Scale/Scope**: ~16 main screens, 60+ components, consuming 72 existing API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: No project-specific constitution defined yet (`.specify/memory/constitution.md` contains template only)

**Assumed Best Practices**:
- ✅ Test-driven development for critical user flows
- ✅ Modular architecture with clear separation of concerns
- ✅ API contracts documented and versioned
- ✅ Performance benchmarks defined in success criteria
- ✅ Accessibility support (VoiceOver, Dynamic Type)

**No violations detected** - proceeding with standard mobile development practices.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Selected Structure**: Mobile + Existing API (Option 3)

```text
# Backend API (EXISTING - No changes)
pages/api/                          # 72 Next.js API routes (preserved)
├── lessons.js                      # Lesson CRUD
├── auth/                           # Authentication endpoints
├── user/                           # User profile, points, stats
├── leaderboard/                    # Rankings, achievements
├── dictionary.js                   # Vocabulary lookup
└── ...                             # Additional 67 endpoints

# NEW: React Native Mobile App
react-native-german-app/            # New directory at repo root
├── src/
│   ├── navigation/                 # React Navigation setup
│   │   ├── AppNavigator.tsx        # Root navigator
│   │   ├── AuthStack.tsx           # Login/register flow
│   │   ├── MainTabs.tsx            # Bottom tabs
│   │   └── LessonStack.tsx         # Lesson screens
│   ├── screens/                    # Screen components
│   │   ├── Home/                   # Lesson browsing (P1)
│   │   ├── Lesson/                 # Shadowing mode (P1)
│   │   ├── Dictation/              # Dictation practice (P2)
│   │   ├── Profile/                # User stats (P3)
│   │   └── Auth/                   # Login/register (P3)
│   ├── components/                 # Reusable UI components
│   │   ├── atoms/                  # Button, Input, Card
│   │   ├── molecules/              # LessonCard, SearchBar
│   │   └── organisms/              # Header, DictionaryModal
│   ├── services/                   # Business logic
│   │   ├── api.ts                  # API client (axios)
│   │   ├── auth.ts                 # Authentication
│   │   ├── audio.ts                # Audio playback
│   │   └── storage.ts              # Local storage
│   ├── context/                    # React Context
│   │   ├── AuthContext.tsx         # User session
│   │   ├── ThemeContext.tsx        # Dark/light mode
│   │   └── LanguageContext.tsx     # i18n
│   ├── hooks/                      # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useLessons.ts
│   │   └── useAudioPlayer.ts
│   ├── types/                      # TypeScript types
│   │   ├── Lesson.ts
│   │   ├── User.ts
│   │   └── api.ts
│   ├── utils/                      # Helpers
│   │   ├── constants.ts
│   │   └── validation.ts
│   └── styles/                     # Global styles
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
├── assets/                         # Images, fonts
├── ios/                            # iOS native code
├── android/                        # Android native code (future)
├── __tests__/                      # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── app.json                        # Expo config
├── package.json
└── tsconfig.json
```

**Structure Decision**: This follows the standard React Native architecture with Expo. The mobile app is completely separate from the existing Next.js web app but shares the same backend API. No modifications to existing web code required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected** - N/A

---

## Phase 0: Research ✅ COMPLETE

All technical unknowns have been resolved. See [research.md](./research.md) for detailed analysis.

### Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Platform** | React Native with TypeScript | Team familiarity, code sharing, cross-platform potential |
| **Framework** | Expo (Managed Workflow) | Rapid development, built-in features, can eject later |
| **Navigation** | React Navigation 6.x | Industry standard, excellent TypeScript support |
| **State** | React Context + SWR | Lightweight, sufficient complexity |
| **Audio** | expo-av | Handles all requirements (speed, seek, background) |
| **Storage** | AsyncStorage + SecureStore + FileSystem | Native, secure, covers all use cases |
| **Testing** | Jest + React Native Testing Library + Detox | Standard stack, fast feedback |

---

## Phase 1: Design ✅ COMPLETE

Data models and API contracts have been defined. See documentation below.

### Deliverables

- ✅ [data-model.md](./data-model.md) - 7 core entities with TypeScript types
- ✅ [quickstart.md](./quickstart.md) - Development setup guide
- ✅ [contracts/README.md](./contracts/README.md) - API contract overview
- ✅ [contracts/auth-api.md](./contracts/auth-api.md) - Authentication endpoints
- ✅ [contracts/lessons-api.md](./contracts/lessons-api.md) - Lesson browsing
- ⏳ [contracts/progress-api.md](./contracts/progress-api.md) - **TODO**: User progress tracking
- ⏳ [contracts/leaderboard-api.md](./contracts/leaderboard-api.md) - **TODO**: Rankings
- ⏳ [contracts/dictionary-api.md](./contracts/dictionary-api.md) - **TODO**: Vocabulary lookup
- ✅ Agent context updated (CLAUDE.md)

**Note**: Remaining contract files (progress, leaderboard, dictionary) should follow the same pattern as auth and lessons APIs.

---

## Phase 2: Implementation Tasks

**Status**: ⏳ Pending - Use `/speckit.tasks` command to generate task breakdown

The tasks command will create a detailed implementation plan broken down by:
- User stories (P1 → P2 → P3)
- Individual screens and components
- Testing requirements
- Deployment steps

---

## Summary

**Planning Status**: Phases 0-1 complete, ready for Phase 2 (task breakdown)

**What's Done**:
- ✅ All technical decisions made (React Native + Expo)
- ✅ Data model defined (7 entities, 25+ TypeScript types)
- ✅ Core API contracts documented (auth, lessons)
- ✅ Development environment setup guide created
- ✅ Agent context updated

**What's Next**:
1. Run `/speckit.tasks` to generate implementation tasks
2. Follow quickstart.md to set up development environment
3. Begin implementation starting with P1 user stories (browse lessons, audio shadowing)

**Estimated Timeline** (from research.md): 3-4 months full-time development
