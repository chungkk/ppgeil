import { Lesson } from '../../lib/models/Lesson';
import { ArticleCategory } from '../../lib/models/ArticleCategory';
import { UserProgress } from '../../lib/models/UserProgress';
import connectDB from '../../lib/mongodb';
import { optionalAuth } from '../../lib/authMiddleware';

/**
 * Optimized API endpoint for homepage data
 * Fetches all categories with their lessons in a single database query
 * This reduces N+1 API calls to just 1 call
 */
async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await connectDB();

        const difficulty = req.query.difficulty;
        const lessonsPerCategory = parseInt(req.query.limit) || 6;
        const beginnerLevels = ['A1', 'A2'];

        // Build difficulty filter
        let levelFilter = {};
        if (difficulty === 'beginner') {
            levelFilter = { level: { $in: beginnerLevels } };
        } else if (difficulty === 'experienced') {
            levelFilter = { level: { $nin: beginnerLevels } };
        }

        // Fetch active categories and all matching lessons in parallel
        const [categories, allLessons] = await Promise.all([
            ArticleCategory.find({ isActive: true })
                .sort({ isSystem: 1, order: 1 })
                .lean(),
            Lesson.find(levelFilter)
                .populate('category')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        // Fetch user progress if logged in
        let userProgressMap = {};
        if (req.user) {
            const lessonIds = allLessons.map(l => l.id);
            const userProgress = await UserProgress.find({
                userId: req.user._id,
                lessonId: { $in: lessonIds }
            }).lean();
            
            for (const progress of userProgress) {
                const key = `${progress.lessonId}_${progress.mode}`;
                userProgressMap[key] = progress.studyTime || 0;
            }
        }

        // Get user unlock info for lock status
        const userUnlockedLessons = req.user?.unlockedLessons ?? [];
        const isAdmin = req.user?.role === 'admin';

        // Group lessons by category and limit per category
        const lessonsByCategory = {};
        const lessonCountByCategory = {};

        for (const lesson of allLessons) {
            if (!lesson.category) continue;

            const categoryId = lesson.category._id.toString();

            // Count total lessons per category
            lessonCountByCategory[categoryId] = (lessonCountByCategory[categoryId] || 0) + 1;

            // Only keep first N lessons per category
            if (!lessonsByCategory[categoryId]) {
                lessonsByCategory[categoryId] = [];
            }
            if (lessonsByCategory[categoryId].length < lessonsPerCategory) {
                // Determine lock status
                const isUnlocked = isAdmin || 
                                  lesson.isFreeLesson || 
                                  userUnlockedLessons.includes(lesson.id);
                
                // Add user study time and lock status to lesson
                const lessonWithProgress = {
                    ...lesson,
                    shadowStudyTime: userProgressMap[`${lesson.id}_shadowing`] || 0,
                    dictationStudyTime: userProgressMap[`${lesson.id}_dictation`] || 0,
                    isLocked: !isUnlocked
                };
                lessonsByCategory[categoryId].push(lessonWithProgress);
            }
        }

        // Build response with categories that have lessons
        const categoriesWithLessons = {};
        const filteredCategories = [];

        for (const category of categories) {
            const categoryId = category._id.toString();
            const lessons = lessonsByCategory[categoryId];

            if (lessons && lessons.length > 0) {
                filteredCategories.push(category);
                categoriesWithLessons[category.slug] = {
                    category,
                    lessons,
                    totalCount: lessonCountByCategory[categoryId] || lessons.length
                };
            }
        }

        // Cache for 5 minutes
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

        return res.status(200).json({
            categories: filteredCategories,
            categoriesWithLessons,
            userUnlockInfo: req.user ? {
                freeUnlocksRemaining: req.user.freeUnlocksRemaining ?? 2, // Default 2 for existing users
                unlockedCount: userUnlockedLessons.length,
                points: req.user.points ?? 0
            } : null
        });

    } catch (error) {
        console.error('Homepage data error:', error);
        return res.status(500).json({ message: error.message });
    }
}

export default optionalAuth(handler);
