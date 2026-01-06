import { Lesson } from '../../lib/models/Lesson';
import { ArticleCategory } from '../../lib/models/ArticleCategory';
import connectDB from '../../lib/mongodb';

/**
 * Optimized API endpoint for homepage data
 * Fetches all categories with their lessons in a single database query
 * This reduces N+1 API calls to just 1 call
 */
export default async function handler(req, res) {
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
                lessonsByCategory[categoryId].push(lesson);
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
            categoriesWithLessons
        });

    } catch (error) {
        console.error('Homepage data error:', error);
        return res.status(500).json({ message: error.message });
    }
}
