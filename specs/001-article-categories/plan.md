# Implementation Plan: Article Category System

**Branch**: `001-article-categories` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-article-categories/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a category management system for articles/lessons that allows administrators to create and manage article categories, assign single categories to articles, and enable users to filter articles by category. The system uses a flat category structure with a mandatory default "Chưa phân loại" (Uncategorized) category, supporting Vietnamese language in category names and URL-friendly slugs.

**Technical Approach**: Extend existing Mongoose models (Lesson) to include category reference field. Create new ArticleCategory model with CRUD operations via Next.js API routes. Implement admin UI for category management similar to existing vocabulary categories interface. Add category filter UI to article listing pages with URL query parameter support for bookmarking.

## Technical Context

**Language/Version**: JavaScript (Node.js) with Next.js 15.5.9  
**Primary Dependencies**: React 19.2.3, Next.js 15.5.9, Mongoose 8.19.2, MongoDB 6.20.0, JWT (jsonwebtoken 9.0.2)  
**Storage**: MongoDB (cloud-hosted via MONGODB_URI env variable)  
**Testing**: Limited testing infrastructure - tests directory exists with youtube-srt tests only  
**Target Platform**: Web application (server-side rendering + API routes), iOS app via Capacitor 8.0.0  
**Project Type**: Web full-stack application (Next.js hybrid SSR/API)  
**Performance Goals**: <2s category filter response time, <500ms admin operations, support up to 50 categories without UI degradation  
**Constraints**: Must maintain backward compatibility with existing Lesson model, Vietnamese character support in slugs, single database transaction for category deletion with article reassignment  
**Scale/Scope**: ~10-50 categories expected, lessons collection already exists (pagination implemented), admin-only category management

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASSED (Constitution template is empty/not yet defined for this project)

**Note**: The project's constitution file (`.specify/memory/constitution.md`) contains only template placeholders. Once project-specific principles are defined, this section should be re-evaluated against those principles. For now, we proceed with standard best practices:
- Single responsibility: Category management is isolated
- Existing patterns: Following established Mongoose model + API route pattern
- No new architectural complexity introduced
- Backward compatible with existing Lesson/PageContent models

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

```text
# Next.js Full-Stack Application Structure

# Backend (API Routes & Data Models)
pages/api/
├── article-categories/
│   └── index.js              # NEW: CRUD operations for categories
├── lessons/
│   └── [id].js               # MODIFIED: Add category field support
└── lessons.js                # MODIFIED: Add category filtering

lib/
└── models/
    └── ArticleCategory.js    # NEW: Category model with slug generation

models/                       # Legacy location (PageContent, User, etc.)
    └── ArticleCategory.js    # Alternative: May use this location instead

# Frontend (Pages & Components)
pages/
├── admin/
│   └── dashboard/
│       ├── categories.js     # EXISTS: Vocab categories (reference pattern)
│       └── article-categories.js  # NEW: Article category management UI
└── index.js                  # MODIFIED: Add category filter UI

components/
├── CategoryFilter.jsx        # NEW: Reusable category filter component
└── AdminDashboardLayout.jsx  # EXISTS: Layout wrapper for admin pages

# Styling
styles/
└── adminDashboard.module.css # EXISTS: Reuse existing styles

# Documentation (this feature)
specs/001-article-categories/
├── plan.md                   # This file
├── research.md               # Phase 0 output (next step)
├── data-model.md             # Phase 1 output
├── quickstart.md             # Phase 1 output
└── contracts/                # Phase 1 output
    └── article-categories-api.yaml
```

**Structure Decision**: Next.js hybrid architecture with API routes for backend and React components for frontend. Models stored in `lib/models/` or `models/` directory (project uses both - will follow `lib/models/` pattern for new code). Admin pages follow existing pattern in `pages/admin/dashboard/`. Category management UI will mirror vocabulary categories pattern from `pages/admin/dashboard/categories.js`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
