export const LEAGUES = {
  bronze: { 
    min: 0, 
    max: 999, 
    color: '#CD7F32', 
    name: 'Bronze',
    icon: '🥉'
  },
  silver: { 
    min: 1000, 
    max: 4999, 
    color: '#C0C0C0', 
    name: 'Silver',
    icon: '🥈'
  },
  gold: { 
    min: 5000, 
    max: 14999, 
    color: '#FFD700', 
    name: 'Gold',
    icon: '🥇'
  },
  platinum: { 
    min: 15000, 
    max: 49999, 
    color: '#E5E4E2', 
    name: 'Platinum',
    icon: '💎'
  },
  diamond: { 
    min: 50000, 
    max: Infinity, 
    color: '#B9F2FF', 
    name: 'Diamond',
    icon: '👑'
  }
};

export const LEAGUE_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export const PROMOTION_COUNT = 5;
export const DEMOTION_COUNT = 5;

export const RANKING_CRITERIA = {
  points: {
    key: 'points',
    label: 'Total Points',
    labelVi: 'Tổng điểm',
    sortField: 'points',
    icon: '💎'
  },
  streak: {
    key: 'streak',
    label: 'Streak Champions',
    labelVi: 'Streak dài nhất',
    sortField: 'streak.currentStreak',
    icon: '🔥'
  },
  time: {
    key: 'time',
    label: 'Time Invested',
    labelVi: 'Thời gian học',
    sortField: 'totalTimeSpent',
    icon: '⏱️'
  },
  lessons: {
    key: 'lessons',
    label: 'Lessons Completed',
    labelVi: 'Bài học hoàn thành',
    sortField: 'lessonsCompleted',
    icon: '📚'
  },
  improved: {
    key: 'improved',
    label: 'Most Improved',
    labelVi: 'Tiến bộ nhất',
    sortField: 'weeklyPoints',
    icon: '📈'
  }
};

export const TIME_PERIODS = {
  week: {
    key: 'week',
    label: 'This Week',
    labelVi: 'Tuần này'
  },
  month: {
    key: 'month',
    label: 'This Month',
    labelVi: 'Tháng này'
  },
  alltime: {
    key: 'alltime',
    label: 'All Time',
    labelVi: 'Tất cả'
  }
};

export const BADGE_TYPES = {
  top_monthly: {
    type: 'top_monthly',
    name: 'Top Monthly',
    nameVi: 'Top Tháng',
    description: 'Achieved Top 10 in monthly leaderboard',
    descriptionVi: 'Đạt Top 10 bảng xếp hạng tháng',
    icon: '🏆'
  },
  top_alltime: {
    type: 'top_alltime',
    name: 'Top All-Time',
    nameVi: 'Top Tổng',
    description: 'Currently in Top 10 all-time',
    descriptionVi: 'Đang trong Top 10 tổng',
    icon: '👑'
  }
};

export function getLeagueByPoints(points) {
  for (const [key, league] of Object.entries(LEAGUES)) {
    if (points >= league.min && points <= league.max) {
      return key;
    }
  }
  return 'bronze';
}

export function getNextLeague(currentLeague) {
  const currentIndex = LEAGUE_ORDER.indexOf(currentLeague);
  if (currentIndex === -1 || currentIndex === LEAGUE_ORDER.length - 1) {
    return null;
  }
  const nextKey = LEAGUE_ORDER[currentIndex + 1];
  return { key: nextKey, ...LEAGUES[nextKey] };
}

export function getPreviousLeague(currentLeague) {
  const currentIndex = LEAGUE_ORDER.indexOf(currentLeague);
  if (currentIndex <= 0) {
    return null;
  }
  const prevKey = LEAGUE_ORDER[currentIndex - 1];
  return { key: prevKey, ...LEAGUES[prevKey] };
}
