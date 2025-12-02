# Quickstart: Profile Page Enhancement

## Overview

Enhance UserProfileSidebar to display more user information from existing User model.

## Files to Modify

1. `/components/UserProfileSidebar.js` - Add new info sections
2. `/styles/UserProfileSidebar.module.css` - Add styles for new sections

## Implementation Steps

### Step 1: Update UserProfileSidebar.js

Add new sections:
- League badge with visual indicator
- Streak stats (daily + answer streak)
- Stats grid (time spent, level, member since)
- Email display

### Step 2: Add CSS Styles

New CSS classes needed:
- `.leagueBadge` - League indicator with gradient
- `.streakSection` - Streak stats container
- `.statsGrid` - 2-column grid for stats
- `.statItem` - Individual stat card

## Key Formatting Functions

```javascript
// Format time spent (minutes to hours)
const formatTimeSpent = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

// Format member since date
const formatMemberSince = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMonths = Math.floor((now - date) / (1000 * 60 * 60 * 24 * 30));
  if (diffMonths < 1) return 'Mới tham gia';
  if (diffMonths === 1) return '1 tháng trước';
  return `${diffMonths} tháng trước`;
};

// Get league emoji
const getLeagueEmoji = (league) => {
  const leagues = {
    bronze: '🥉',
    silver: '🥈', 
    gold: '🥇',
    platinum: '💎',
    diamond: '👑'
  };
  return leagues[league] || '🥉';
};
```

## No API Changes Required

All data already available in `useAuth()` context.
