import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { fetchWithAuth } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/leaderboard.module.css';
import RankingCriteriaTabs from '../../components/leaderboard/RankingCriteriaTabs';
import UserRankCard from '../../components/leaderboard/UserRankCard';
import PersonalStatsCard from '../../components/leaderboard/PersonalStatsCard';
import ProgressChart from '../../components/leaderboard/ProgressChart';
import LeaderboardTabs from '../../components/leaderboard/LeaderboardTabs';
import LeagueSelector from '../../components/leaderboard/LeagueSelector';
import { LEAGUES } from '../../lib/constants/leagues';

const fetcher = async (url) => {
  try {
    const response = await fetchWithAuth(url);
    if (response && response.success) {
      return response.data;
    }
    const publicResponse = await fetch(url);
    if (publicResponse.ok) {
      const data = await publicResponse.json();
      if (data && data.success) {
        return data.data;
      }
    }
    throw new Error('Failed to fetch leaderboard data');
  } catch (error) {
    try {
      const publicResponse = await fetch(url);
      if (publicResponse.ok) {
        const data = await publicResponse.json();
        if (data && data.success) {
          return data.data;
        }
      }
    } catch (fallbackError) {
      console.error('Fetcher error:', fallbackError);
    }
    throw error;
  }
};

const SkeletonPodium = () => (
  <div className={styles.podiumContainer}>
    <div className={`${styles.podiumItem} ${styles.podiumSecond} ${styles.skeleton}`}>
      <div className={styles.skeletonAvatarLarge}></div>
      <div className={styles.skeletonNameLarge}></div>
      <div className={styles.skeletonPointsLarge}></div>
    </div>
    <div className={`${styles.podiumItem} ${styles.podiumFirst} ${styles.skeleton}`}>
      <div className={styles.skeletonAvatarLarge}></div>
      <div className={styles.skeletonNameLarge}></div>
      <div className={styles.skeletonPointsLarge}></div>
    </div>
    <div className={`${styles.podiumItem} ${styles.podiumThird} ${styles.skeleton}`}>
      <div className={styles.skeletonAvatarLarge}></div>
      <div className={styles.skeletonNameLarge}></div>
      <div className={styles.skeletonPointsLarge}></div>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className={`${styles.userCard} ${styles.skeleton}`}>
    <div className={styles.skeletonBadge}></div>
    <div className={styles.skeletonAvatar}></div>
    <div className={styles.skeletonDetails}>
      <div className={styles.skeletonName}></div>
      <div className={styles.skeletonPoints}></div>
    </div>
  </div>
);

const TrophyIcon = ({ rank }) => {
  const colors = {
    1: '#FFD700',
    2: '#C0C0C0', 
    3: '#CD7F32'
  };
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={colors[rank] || '#8a2be2'}>
      <path d="M5 3h14c.55 0 1 .45 1 1v1c0 2.21-1.79 4-4 4h-.1c-.46 1.74-1.72 3.15-3.4 3.72V15h2.5c.28 0 .5.22.5.5v.5h2v4H6v-4h2v-.5c0-.28.22-.5.5-.5H11v-2.28c-1.68-.57-2.94-1.98-3.4-3.72H7.5C5.29 9 3.5 7.21 3.5 5V4c0-.55.45-1 1-1h.5zm1 2v1c0 1.1.9 2 2 2h.68c.07-.33.18-.65.32-.95V5H6zm12 0h-2v2.05c.14.3.25.62.32.95H17c1.1 0 2-.9 2-2V5z"/>
    </svg>
  );
};

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('alltime');
  const [activeCriteria, setActiveCriteria] = useState('points');
  const [activeLeague, setActiveLeague] = useState(null); // null = global view, string = league filter
  const [animateItems, setAnimateItems] = useState(false);

  // Get user's league from userRankData when available
  const userLeague = user ? (user.currentLeague || 'bronze') : null;

  // Use by-criteria API when not using points, otherwise use original endpoints
  const getApiUrl = () => {
    // League filter mode
    if (activeLeague) {
      return `/api/leaderboard/leagues?league=${activeLeague}&limit=100`;
    }
    
    if (activeCriteria !== 'points') {
      return `/api/leaderboard/by-criteria?criteria=${activeCriteria}&period=${activeTab}&limit=100`;
    }
    switch (activeTab) {
      case 'weekly':
        return `/api/leaderboard/weekly?limit=100`;
      case 'monthly':
        return `/api/leaderboard/monthly?limit=100`;
      default:
        return `/api/leaderboard/alltime?limit=100`;
    }
  };

  // Handle league selection
  const handleLeagueChange = (league) => {
    if (activeLeague === league) {
      setActiveLeague(null); // Toggle off to return to global view
    } else {
      setActiveLeague(league);
    }
  };

  const apiUrl = getApiUrl();

  const { data, error, isLoading, mutate } = useSWR(
    !authLoading ? apiUrl : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
      refreshInterval: 5 * 60 * 1000,
    }
  );

  // Handle retry
  const handleRetry = () => {
    mutate();
  };

  // Fetch detailed user rank data for PersonalStatsCard
  const { data: userRankData, isLoading: userRankLoading } = useSWR(
    !authLoading && user ? '/api/leaderboard/user-rank' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  useEffect(() => {
    if (data) {
      setAnimateItems(false);
      const timer = setTimeout(() => setAnimateItems(true), 50);
      return () => clearTimeout(timer);
    }
  }, [data, activeTab, activeCriteria, activeLeague]);

  const leaderboardData = data?.leaderboard || [];
  const currentUserRank = data?.currentUserRank || null;
  const countdown = data?.countdown || null;

  const topThree = leaderboardData.slice(0, 3);
  const restOfUsers = leaderboardData.slice(3);

  if (authLoading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpinner}></div>
        <p>{t('leaderboard.loading')}</p>
      </div>
    );
  }

  const getPoints = (userData) => {
    // For by-criteria responses, use valueLabel or value
    if (activeCriteria !== 'points' && userData.valueLabel) {
      return userData.valueLabel;
    }
    if (activeCriteria !== 'points' && userData.value !== undefined) {
      return userData.value;
    }
    switch (activeTab) {
      case 'weekly':
        return userData.weeklyPoints || 0;
      case 'monthly':
        return userData.monthlyPoints || 0;
      default:
        return userData.totalPoints || userData.points || 0;
    }
  };

  const getCurrentUserPoints = () => {
    if (!currentUserRank) return 0;
    // For by-criteria responses
    if (activeCriteria !== 'points' && currentUserRank.valueLabel) {
      return currentUserRank.valueLabel;
    }
    if (activeCriteria !== 'points' && currentUserRank.value !== undefined) {
      return currentUserRank.value;
    }
    switch (activeTab) {
      case 'weekly':
        return currentUserRank.weeklyPoints || 0;
      case 'monthly':
        return currentUserRank.monthlyPoints || 0;
      default:
        return currentUserRank.totalPoints || currentUserRank.points || 0;
    }
  };

  const getCriteriaIcon = () => {
    const icons = { points: '💎', streak: '🔥', time: '⏱️', lessons: '📚', improved: '📈' };
    return icons[activeCriteria] || '💎';
  };

  const formatPoints = (points) => {
    // If it's already a formatted string (from valueLabel), return as is
    if (typeof points === 'string') return points;
    if (points >= 1000000) return (points / 1000000).toFixed(1) + 'M';
    if (points >= 1000) return (points / 1000).toFixed(1) + 'K';
    return points;
  };

  const podiumOrder = [1, 0, 2];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>🏆</span>
            {t('leaderboard.title')}
          </h1>
          <p className={styles.subtitle}>{t('leaderboard.subtitle')}</p>
        </div>
        
        {/* Time Period Tabs */}
        <LeaderboardTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* Ranking Criteria Tabs */}
        <RankingCriteriaTabs 
          activeCriteria={activeCriteria} 
          onCriteriaChange={setActiveCriteria} 
        />
      </div>

      {/* Countdown for Weekly/Monthly */}
      {(activeTab === 'weekly' || activeTab === 'monthly') && countdown && (
        <div className={`${styles.countdownContainer} ${animateItems ? styles.fadeIn : ''}`}>
          <span className={styles.countdownLabel}>
            {activeTab === 'weekly' ? t('leaderboard.resetsIn') : t('leaderboard.endsIn')}
          </span>
          <div className={styles.countdownTimer}>
            <div className={styles.countdownItem}>
              <span className={styles.countdownValue}>{String(countdown.days).padStart(2, '0')}</span>
              <span className={styles.countdownUnit}>{t('leaderboard.days')}</span>
            </div>
            <span className={styles.countdownSeparator}>:</span>
            <div className={styles.countdownItem}>
              <span className={styles.countdownValue}>{String(countdown.hours).padStart(2, '0')}</span>
              <span className={styles.countdownUnit}>{t('leaderboard.hours')}</span>
            </div>
            <span className={styles.countdownSeparator}>:</span>
            <div className={styles.countdownItem}>
              <span className={styles.countdownValue}>{String(countdown.minutes).padStart(2, '0')}</span>
              <span className={styles.countdownUnit}>{t('leaderboard.minutes')}</span>
            </div>
          </div>
        </div>
      )}

      {/* League Selector */}
      <LeagueSelector
        activeLeague={activeLeague}
        onLeagueChange={handleLeagueChange}
        userLeague={userRankData?.league?.current || userLeague}
      />

      {/* Personal Stats Card - Detailed View */}
      {user && !activeLeague && (
        <PersonalStatsCard 
          data={userRankData} 
          isLoading={userRankLoading} 
        />
      )}

      {/* Progress Chart - Rank History (hide in league view) */}
      {user && !activeLeague && <ProgressChart />}

      {/* Main Content */}
      <div className={styles.mainCard}>
        {error ? (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.errorTitle}>{t('leaderboard.errorTitle')}</p>
            <p className={styles.errorSubtitle}>{t('leaderboard.errorSubtitle')}</p>
            <button className={styles.retryButton} onClick={handleRetry}>
              {t('leaderboard.retry')}
            </button>
          </div>
        ) : isLoading ? (
          <>
            <SkeletonPodium />
            <div className={styles.listSection}>
              {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : leaderboardData.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏆</div>
            <p className={styles.emptyTitle}>{t('leaderboard.emptyState')}</p>
            <p className={styles.emptySubtitle}>{t('leaderboard.startLearning')}</p>
          </div>
        ) : (
          <>
            {/* Desktop Podium - Top 3 */}
            {topThree.length >= 3 && (
              <div className={`${styles.podiumContainer} ${animateItems ? styles.fadeInUp : ''}`}>
                {podiumOrder.map((orderIndex) => {
                  const userData = topThree[orderIndex];
                  if (!userData) return null;
                  const rank = orderIndex + 1;
                  const podiumClass = rank === 1 ? styles.podiumFirst : rank === 2 ? styles.podiumSecond : styles.podiumThird;
                  
                  return (
                    <div 
                      key={userData.id} 
                      className={`${styles.podiumItem} ${podiumClass} ${userData.isCurrentUser ? styles.podiumCurrentUser : ''}`}
                      style={{ animationDelay: `${rank * 150}ms` }}
                    >
                      <div className={styles.podiumCrown}>
                        {rank === 1 && <span className={styles.crownIcon}>👑</span>}
                      </div>
                      <div className={styles.podiumAvatarWrapper}>
                        <div className={styles.podiumAvatar} data-rank={rank}>
                          {userData.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.podiumRankBadge} data-rank={rank}>
                          {rank}
                        </div>
                      </div>
                      <h3 className={styles.podiumName}>{userData.name}</h3>
                      <div className={styles.podiumPoints}>
                        <TrophyIcon rank={rank} />
                        <span>{formatPoints(getPoints(userData))}</span>
                      </div>
                      <div className={styles.podiumBase} data-rank={rank}></div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile Top 3 Cards */}
            <div className={styles.mobileTop3}>
              {topThree.map((userData, index) => (
                <div
                  key={userData.id}
                  className={`${styles.mobileTopCard} ${styles[`mobileRank${index + 1}`]} ${userData.isCurrentUser ? styles.isCurrentUser : ''} ${animateItems ? styles.fadeInUp : ''}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={styles.mobileTopLeft}>
                    <div className={styles.mobileTopRank} data-rank={index + 1}>
                      {index + 1}
                    </div>
                    <div className={styles.mobileTopAvatar} data-rank={index + 1}>
                      {userData.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.mobileTopInfo}>
                      <h3 className={styles.mobileTopName}>{userData.name}</h3>
                      {userData.isCurrentUser && <span className={styles.youBadge}>You</span>}
                    </div>
                  </div>
                  <div className={styles.mobileTopPoints}>
                    <span className={styles.pointIcon}>{getCriteriaIcon()}</span>
                    {formatPoints(getPoints(userData))}
                  </div>
                </div>
              ))}
            </div>

            {/* Rest of Users List */}
            {restOfUsers.length > 0 && (
              <div className={styles.listSection}>
                <div className={styles.listHeader}>
                  <span className={styles.listTitle}>{t('leaderboard.topLearners')}</span>
                  <span className={styles.listCount}>{restOfUsers.length} more</span>
                </div>
                <div className={styles.userList}>
                  {restOfUsers.map((userData, index) => (
                    <div
                      key={userData.id}
                      className={`${styles.userCard} ${userData.isCurrentUser ? styles.isCurrentUser : ''} ${animateItems ? styles.fadeInUp : ''}`}
                      style={{ animationDelay: `${(index + 3) * 30}ms` }}
                    >
                      <div className={styles.userCardLeft}>
                        <div className={styles.userRank}>#{userData.rank}</div>
                        <div className={styles.userAvatar}>
                          {userData.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userInfo}>
                          <h3 className={styles.userName}>{userData.name}</h3>
                          {userData.isCurrentUser && <span className={styles.youBadge}>You</span>}
                        </div>
                      </div>
                      <div className={styles.userCardRight}>
                        <span className={styles.pointIcon}>{getCriteriaIcon()}</span>
                        <span className={styles.userPoints}>{formatPoints(getPoints(userData))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(seconds) {
  if (!seconds) return '0h 0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}
