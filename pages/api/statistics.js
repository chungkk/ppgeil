import { optionalAuth, requireAuth } from '../../lib/authMiddleware';
import { DailyStats } from '../../lib/models/DailyStats';
import connectDB from '../../lib/mongodb';

/**
 * Statistics API
 * GET - Get statistics summary (today, thisWeek, thisMonth) + weekly activity
 * POST - Record a learning event (shadowing or dictation)
 */

// Helper functions
function getTodayDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

function getWeekStartDate() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as week start
    const result = new Date(now);
    result.setDate(diff);
    return result.toISOString().split('T')[0];
}

function getMonthStartDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

function getEmptyStats() {
    return {
        shadowing: {
            recorded: 0,
            correct: 0,
            incorrect: 0,
            totalSimilarity: 0,
            pointsEarned: 0,
            studyTimeSeconds: 0
        },
        dictation: {
            completed: 0,
            hintsUsed: 0,
            pointsEarned: 0,
            studyTimeSeconds: 0
        },
        pointsDeducted: 0
    };
}

function aggregateStats(statsArray) {
    const result = getEmptyStats();

    statsArray.forEach(day => {
        if (day.shadowing) {
            result.shadowing.recorded += day.shadowing.recorded || 0;
            result.shadowing.correct += day.shadowing.correct || 0;
            result.shadowing.incorrect += day.shadowing.incorrect || 0;
            result.shadowing.totalSimilarity += day.shadowing.totalSimilarity || 0;
            result.shadowing.pointsEarned += day.shadowing.pointsEarned || 0;
            result.shadowing.studyTimeSeconds += day.shadowing.studyTimeSeconds || 0;
        }
        if (day.dictation) {
            result.dictation.completed += day.dictation.completed || 0;
            result.dictation.hintsUsed += day.dictation.hintsUsed || 0;
            result.dictation.pointsEarned += day.dictation.pointsEarned || 0;
            result.dictation.studyTimeSeconds += day.dictation.studyTimeSeconds || 0;
        }
        result.pointsDeducted += day.pointsDeducted || 0;
    });

    return result;
}

function getAverageSimilarity(stats) {
    if (!stats.shadowing || stats.shadowing.recorded === 0) return 0;
    return Math.round(stats.shadowing.totalSimilarity / stats.shadowing.recorded);
}

async function handler(req, res) {
    await connectDB();

    // GET - Fetch statistics summary
    if (req.method === 'GET') {
        try {
            // Guest users get empty stats
            if (!req.user) {
                const emptyStats = getEmptyStats();
                return res.status(200).json({
                    success: true,
                    stats: {
                        today: { ...emptyStats, date: getTodayDateString() },
                        thisWeek: { ...emptyStats, date: 'week' },
                        thisMonth: { ...emptyStats, date: 'month' }
                    },
                    weeklyActivity: {
                        dates: getLast7Days(),
                        shadowing: [0, 0, 0, 0, 0, 0, 0],
                        dictation: [0, 0, 0, 0, 0, 0, 0]
                    },
                    isGuest: true
                });
            }

            const today = getTodayDateString();
            const weekStart = getWeekStartDate();
            const monthStart = getMonthStartDate();

            // Fetch all stats from month start to today
            const allStats = await DailyStats.find({
                userId: req.user._id,
                date: { $gte: monthStart, $lte: today }
            }).sort({ date: -1 });

            // Get today's stats
            const todayStats = allStats.find(s => s.date === today);
            const todayData = todayStats ? {
                ...todayStats.toObject(),
                avgSimilarity: getAverageSimilarity(todayStats)
            } : { ...getEmptyStats(), date: today };

            // Aggregate this week's stats
            const weekStats = allStats.filter(s => s.date >= weekStart);
            const weekData = {
                ...aggregateStats(weekStats),
                date: 'week'
            };
            weekData.avgSimilarity = getAverageSimilarity(weekData);

            // Aggregate this month's stats
            const monthData = {
                ...aggregateStats(allStats),
                date: 'month'
            };
            monthData.avgSimilarity = getAverageSimilarity(monthData);

            // Build weekly activity for chart (last 7 days)
            const last7Days = getLast7Days();
            const weeklyActivity = {
                dates: last7Days,
                shadowing: last7Days.map(date => {
                    const dayStats = allStats.find(s => s.date === date);
                    return dayStats?.shadowing?.recorded || 0;
                }),
                dictation: last7Days.map(date => {
                    const dayStats = allStats.find(s => s.date === date);
                    return dayStats?.dictation?.completed || 0;
                })
            };

            return res.status(200).json({
                success: true,
                stats: {
                    today: todayData,
                    thisWeek: weekData,
                    thisMonth: monthData
                },
                weeklyActivity
            });
        } catch (error) {
            console.error('[Statistics API] GET error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // POST - Record a learning event
    if (req.method === 'POST') {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    requiresAuth: true
                });
            }

            const { type, data } = req.body;

            if (!type || !data) {
                return res.status(400).json({
                    success: false,
                    message: 'type and data are required'
                });
            }

            // Get or create today's stats
            const todayStats = await DailyStats.getOrCreateToday(req.user._id);

            if (type === 'shadowing') {
                const { similarity, isCorrect, pointsEarned, studyTimeSeconds } = data;

                todayStats.shadowing.recorded += 1;
                todayStats.shadowing.totalSimilarity += similarity || 0;

                if (isCorrect) {
                    todayStats.shadowing.correct += 1;
                } else {
                    todayStats.shadowing.incorrect += 1;
                }

                todayStats.shadowing.pointsEarned += pointsEarned || 0;

                if (studyTimeSeconds) {
                    todayStats.shadowing.studyTimeSeconds += studyTimeSeconds;
                }
            } else if (type === 'dictation') {
                const { hintsUsed, pointsEarned, studyTimeSeconds } = data;

                todayStats.dictation.completed += 1;
                todayStats.dictation.hintsUsed += hintsUsed || 0;
                todayStats.dictation.pointsEarned += pointsEarned || 0;

                if (studyTimeSeconds) {
                    todayStats.dictation.studyTimeSeconds += studyTimeSeconds;
                }
            } else if (type === 'pointsDeducted') {
                todayStats.pointsDeducted += data.points || 0;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type. Must be shadowing, dictation, or pointsDeducted'
                });
            }

            await todayStats.save();

            console.log('[Statistics API] Recorded:', { type, data, date: todayStats.date });

            return res.status(200).json({
                success: true,
                message: 'Statistics recorded',
                todayStats: todayStats.toObject()
            });
        } catch (error) {
            console.error('[Statistics API] POST error:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    return res.status(405).json({
        success: false,
        message: 'Method not allowed'
    });
}

export default optionalAuth(handler);
