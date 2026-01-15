import mongoose from 'mongoose';

/**
 * DailyStats model - Stores daily learning statistics per user
 * Mirrors iOS statistics.service.ts structure
 */
const DailyStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: String, // YYYY-MM-DD format
        required: true,
        index: true
    },
    shadowing: {
        recorded: { type: Number, default: 0 },      // Sentences recorded
        correct: { type: Number, default: 0 },        // Sentences ≥80% similarity
        incorrect: { type: Number, default: 0 },      // Sentences <80% similarity
        totalSimilarity: { type: Number, default: 0 }, // Sum of all similarity scores
        pointsEarned: { type: Number, default: 0 },
        studyTimeSeconds: { type: Number, default: 0 }
    },
    dictation: {
        completed: { type: Number, default: 0 },      // Sentences completed correctly
        hintsUsed: { type: Number, default: 0 },
        pointsEarned: { type: Number, default: 0 },
        studyTimeSeconds: { type: Number, default: 0 }
    },
    pointsDeducted: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
DailyStatsSchema.index({ userId: 1, date: -1 });

// Helper static method to get or create today's stats
DailyStatsSchema.statics.getOrCreateToday = async function (userId) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    let stats = await this.findOne({ userId, date: dateStr });
    if (!stats) {
        stats = new this({
            userId,
            date: dateStr,
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
        });
        await stats.save();
    }
    return stats;
};

// Helper to get date range stats
DailyStatsSchema.statics.getStatsInRange = async function (userId, startDate, endDate) {
    return this.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
};

export const DailyStats = mongoose.models.DailyStats || mongoose.model('DailyStats', DailyStatsSchema);
