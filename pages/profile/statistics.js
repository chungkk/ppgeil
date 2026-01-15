import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import SEO from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import { fetchWithAuth } from '../../lib/api';
import styles from '../../styles/statistics.module.css';

/**
 * Statistics Page - Learning statistics dashboard
 * Mirrors iOS StatisticsScreen.tsx functionality
 */

function StatisticsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [weeklyActivity, setWeeklyActivity] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('today');
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/statistics');
            const data = await response.json();

            if (data.success) {
                setStats(data.stats);
                setWeeklyActivity(data.weeklyActivity);
            }
        } catch (error) {
            console.error('[StatisticsPage] Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const getCurrentStats = () => {
        if (!stats) return null;
        switch (selectedPeriod) {
            case 'today':
                return stats.today;
            case 'week':
                return stats.thisWeek;
            case 'month':
                return stats.thisMonth;
            default:
                return stats.today;
        }
    };

    const currentStats = getCurrentStats();

    const formatDayName = (dateStr) => {
        const date = new Date(dateStr);
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return days[date.getDay()];
    };

    const totalPoints = currentStats
        ? (currentStats.shadowing?.pointsEarned || 0) + (currentStats.dictation?.pointsEarned || 0)
        : 0;

    const avgSimilarity = currentStats?.avgSimilarity ||
        (currentStats?.shadowing?.recorded > 0
            ? Math.round(currentStats.shadowing.totalSimilarity / currentStats.shadowing.recorded)
            : 0);

    // Get max value for chart scaling
    const maxChartValue = weeklyActivity
        ? Math.max(...weeklyActivity.shadowing, ...weeklyActivity.dictation, 1)
        : 1;

    if (loading) {
        return (
            <div className={styles.statisticsPage}>
                <div className={styles.statisticsContainer}>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingSpinner}></div>
                        <span className={styles.loadingText}>Đang tải...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <SEO
                title="Thống kê học tập | PapaGeil"
                description="Xem thống kê học tập tiếng Đức của bạn"
                noindex={true}
            />

            <div className={styles.statisticsPage}>
                <div className={styles.statisticsContainer}>
                    {/* Header */}
                    <div className={styles.header}>
                        <h1 className={styles.headerTitle}>📊 Thống kê</h1>
                        <Link href="/profile" className={styles.backButton}>
                            ✕
                        </Link>
                    </div>

                    {/* Period Selector */}
                    <div className={styles.periodSelector}>
                        <button
                            className={`${styles.periodButton} ${selectedPeriod === 'today' ? styles.periodButtonActive : ''}`}
                            onClick={() => setSelectedPeriod('today')}
                        >
                            Hôm nay
                        </button>
                        <button
                            className={`${styles.periodButton} ${selectedPeriod === 'week' ? styles.periodButtonActive : ''}`}
                            onClick={() => setSelectedPeriod('week')}
                        >
                            Tuần này
                        </button>
                        <button
                            className={`${styles.periodButton} ${selectedPeriod === 'month' ? styles.periodButtonActive : ''}`}
                            onClick={() => setSelectedPeriod('month')}
                        >
                            Tháng này
                        </button>
                    </div>

                    {/* Hero Card - Diamonds */}
                    <div className={styles.heroCard}>
                        <span className={styles.heroIcon}>💎</span>
                        <span className={styles.heroValue}>+{totalPoints}</span>
                        <span className={styles.heroLabel}>Kim cương kiếm được</span>
                    </div>

                    {/* Shadowing Section */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>🎙️</span>
                            <h2 className={styles.sectionTitle}>Shadowing</h2>
                        </div>
                        <div className={styles.sectionTopBar} style={{ background: 'var(--retro-purple, #A855F7)' }} />
                        <div className={styles.sectionContent}>
                            <div className={styles.statRow}>
                                <div className={styles.statColumn}>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Đã ghi âm:</span>
                                        <span className={styles.statValue}>{currentStats?.shadowing?.recorded || 0}</span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Đúng:</span>
                                        <span className={`${styles.statValue} ${styles.success}`}>
                                            {currentStats?.shadowing?.correct || 0}
                                        </span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Sai:</span>
                                        <span className={`${styles.statValue} ${styles.error}`}>
                                            {currentStats?.shadowing?.incorrect || 0}
                                        </span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Kim cương:</span>
                                        <div className={styles.diamondInline}>
                                            <span className={styles.diamondIcon}>💎</span>
                                            <span className={styles.statValue}>{currentStats?.shadowing?.pointsEarned || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.progressContainer}>
                                    <div className={styles.progressCircle}>
                                        <span className={styles.progressPercent}>{avgSimilarity}%</span>
                                        <span className={styles.progressLabel}>TB Similarity</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dictation Section */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionIcon}>✍️</span>
                            <h2 className={styles.sectionTitle}>Dictation</h2>
                        </div>
                        <div className={styles.sectionTopBar} style={{ background: 'var(--retro-coral, #FF6B6B)' }} />
                        <div className={styles.sectionContent}>
                            <div className={styles.statRow}>
                                <div className={styles.statColumn}>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Hoàn thành:</span>
                                        <span className={styles.statValue}>{currentStats?.dictation?.completed || 0}</span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Gợi ý đã dùng:</span>
                                        <span className={`${styles.statValue} ${styles.error}`}>
                                            {currentStats?.dictation?.hintsUsed || 0}
                                        </span>
                                    </div>
                                    <div className={styles.statLine}>
                                        <span className={styles.statLabel}>Kim cương:</span>
                                        <div className={styles.diamondInline}>
                                            <span className={styles.diamondIcon}>💎</span>
                                            <span className={styles.statValue}>{currentStats?.dictation?.pointsEarned || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.progressContainer}>
                                    <div className={`${styles.progressCircle} ${styles.coral}`}>
                                        <span className={styles.completedIcon}>✅</span>
                                        <span className={styles.progressLabel}>{currentStats?.dictation?.completed || 0} câu</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Activity Chart */}
                    {weeklyActivity && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionIcon}>📈</span>
                                <h2 className={styles.sectionTitle}>Hoạt động tuần</h2>
                            </div>
                            <div className={styles.sectionTopBar} style={{ background: 'var(--retro-cyan, #4ECDC4)' }} />
                            <div className={styles.chartContainer}>
                                <div className={styles.chartLegend}>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendDot} ${styles.shadowing}`} />
                                        <span className={styles.legendText}>Shadowing</span>
                                    </div>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendDot} ${styles.dictation}`} />
                                        <span className={styles.legendText}>Dictation</span>
                                    </div>
                                </div>
                                <div className={styles.chartBars}>
                                    {weeklyActivity.dates.map((date, index) => (
                                        <div key={date} className={styles.chartColumn}>
                                            <div className={styles.barContainer}>
                                                <div
                                                    className={`${styles.bar} ${styles.shadowing}`}
                                                    style={{
                                                        height: `${Math.max(4, (weeklyActivity.shadowing[index] / maxChartValue) * 60)}px`
                                                    }}
                                                />
                                                <div
                                                    className={`${styles.bar} ${styles.dictation}`}
                                                    style={{
                                                        height: `${Math.max(4, (weeklyActivity.dictation[index] / maxChartValue) * 60)}px`
                                                    }}
                                                />
                                            </div>
                                            <span className={styles.chartLabel}>{formatDayName(date)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tips */}
                    <div className={styles.tipsCard}>
                        <span className={styles.tipsIcon}>💡</span>
                        <span className={styles.tipsText}>
                            Luyện tập mỗi ngày 15-20 phút để đạt kết quả tốt nhất. Hãy cố gắng đạt ≥80% similarity khi shadowing!
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function Statistics() {
    return (
        <ProtectedPage>
            <StatisticsPage />
        </ProtectedPage>
    );
}
