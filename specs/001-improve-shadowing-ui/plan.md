# Implementation Plan: Tối ưu Mobile UI - Shadowing Transcript Column

**Branch**: `001-improve-shadowing-ui` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-improve-shadowing-ui/spec.md`

## Summary

Cải thiện UI/UX cho cột transcript trên trang shadowing mobile bằng cách tối ưu typography, spacing, touch targets và visual hierarchy. Chỉ thay đổi CSS, không ảnh hưởng đến logic.

## Technical Context

**Language/Version**: JavaScript (ES6+), Next.js, React  
**Primary Dependencies**: Next.js, React, CSS Modules, react-i18next  
**Storage**: N/A (UI changes only)  
**Testing**: Manual testing trên thiết bị mobile thực tế  
**Target Platform**: Mobile browsers (iOS Safari, Chrome Android), min-width 320px, breakpoint 768px
**Project Type**: Web (Next.js)  
**Performance Goals**: Không ảnh hưởng đến render performance, CSS changes only  
**Constraints**: Apple HIG touch targets 44pt, WCAG contrast 4.5:1  
**Scale/Scope**: 2 files - ShadowingMobile.js, shadowingPage.module.css

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **PASSED** - Không có vi phạm nào:
- Chỉ thay đổi CSS styles, không thêm dependencies mới
- Không thay đổi logic hoặc data flow
- Tuân thủ existing patterns và conventions

## Project Structure

### Files cần thay đổi

```text
components/
└── shadowing/
    └── ShadowingMobile.js    # Có thể cần điều chỉnh nhỏ className

styles/
└── shadowingPage.module.css   # Thay đổi chính - CSS mobile styles
```

### Spec Documentation

```text
specs/001-improve-shadowing-ui/
├── spec.md              # Feature specification
├── plan.md              # This file
└── research.md          # Mobile UI best practices (Phase 0)
```

## Changes Overview

### CSS Changes (shadowingPage.module.css)

| Selector | Property | Current | New |
|----------|----------|---------|-----|
| `.transcriptText` | font-size | 12-13px | 15px |
| `.transcriptTranslation` | font-size | 10px | 12px |
| `.transcriptIPA` | font-size | 10px | 11px |
| `.transcriptItem` | padding | 8px | 12px 10px |
| `.transcriptList` | gap | 5px | 8px |
| `.sentencePlayButtonMobile` | size | 22px | 28px |
| `.transcriptItemActive` | border-left | 3px | 4px |
| `.mobileControlButton` | font-size | 10px | 11px |

## Complexity Tracking

> Không có vi phạm cần justify
