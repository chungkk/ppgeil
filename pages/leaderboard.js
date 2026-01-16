import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/leaderboard.module.css';


// Simple trophy/medal icons
const RankIcon = ({ rank }) => {
    if (rank === 1) return <span className={styles.medalGold}>🥇</span>;
    if (rank === 2) return <span className={styles.medalSilver}>🥈</span>;
    if (rank === 3) return <span className={styles.medalBronze}>🥉</span>;
    return <span className={styles.rankNumber}>#{rank}</span>;
};

// Generate achievement text based on user stats
const getAchievements = (user, t) => {
    const achievements = [];

    if (user.streak >= 7) {
        achievements.push(`🔥 ${user.streak} ${t('leaderboard.streakDays', { defaultValue: 'Tage Serie' })}`);
    }
    if (user.lessonsCompleted >= 10) {
        achievements.push(`📚 ${user.lessonsCompleted} ${t('leaderboard.lessonsLabel', { defaultValue: 'Lektionen' })}`);
    }
    if (user.points >= 1000) {
        achievements.push(`⭐ ${t('leaderboard.topLearner', { defaultValue: 'Top Lerner' })}`);
    }

    return achievements;
};

export default function LeaderboardPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

                const response = await fetch('/api/leaderboard?limit=50', { headers });
                const data = await response.json();

                if (data.success) {
                    setLeaderboard(data.data.leaderboard);
                } else {
                    setError(data.message || t('leaderboard.errorTitle'));
                }
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
                setError(t('leaderboard.errorTitle'));
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [t]);

    return (
        <>
            <SEO
                title={`${t('leaderboard.title')} - PapaGeil`}
                description={t('leaderboard.subtitle') || 'Compete with other German learners and see who is at the top of the leaderboard'}
                keywords="German learning leaderboard, Deutsch lernen ranking, language competition"
            />


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
                </div>

                {/* Loading State */}
                {loading && (
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner}></div>
                        <p>{t('leaderboard.loading')}</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className={styles.errorState}>
                        <span className={styles.errorIcon}>⚠️</span>
                        <h3>{t('leaderboard.errorTitle')}</h3>
                        <p>{t('leaderboard.errorSubtitle')}</p>
                        <button
                            className={styles.retryBtn}
                            onClick={() => window.location.reload()}
                        >
                            {t('leaderboard.retry')}
                        </button>
                    </div>
                )}

                {/* Leaderboard List */}
                {!loading && !error && (
                    <div className={styles.leaderboardList}>
                        {leaderboard.length === 0 ? (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyIcon}>📊</span>
                                <p>{t('leaderboard.emptyState')}</p>
                                <p className={styles.emptyHint}>{t('leaderboard.startLearning')}</p>
                            </div>
                        ) : (
                            leaderboard.map((entry) => {
                                const achievements = getAchievements(entry, t);
                                const isCurrentUser = entry.isCurrentUser;

                                return (
                                    <div
                                        key={entry.id}
                                        className={`${styles.leaderboardItem} ${isCurrentUser ? styles.currentUser : ''} ${entry.rank <= 3 ? styles.topThree : ''}`}
                                    >
                                        {/* Rank */}
                                        <div className={styles.rankCell}>
                                            <RankIcon rank={entry.rank} />
                                        </div>

                                        {/* User Info */}
                                        <div className={styles.userCell}>
                                            {entry.avatar ? (
                                                <div className={styles.userAvatarImgWrapper}>
                                                    <Image
                                                        src={entry.avatar}
                                                        alt={entry.name}
                                                        fill
                                                        sizes="40px"
                                                        className={styles.userAvatarImg}
                                                        unoptimized
                                                    />
                                                </div>
                                            ) : (
                                                <div className={styles.userAvatar}>
                                                    {entry.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                            )}
                                            <div className={styles.userDetails}>
                                                <span className={styles.userName}>
                                                    {entry.name}
                                                    {isCurrentUser && <span className={styles.youBadge}>{t('leaderboard.you', { defaultValue: '(Du)' })}</span>}
                                                </span>
                                                {achievements.length > 0 && (
                                                    <span className={styles.userAchievements}>
                                                        {achievements.join(' • ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Points */}
                                        <div className={styles.pointsCell}>
                                            <span className={styles.pointsIcon}>💎</span>
                                            <span className={styles.pointsValue}>{entry.points.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

