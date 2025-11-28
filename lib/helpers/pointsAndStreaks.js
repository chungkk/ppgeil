// Helper functions for managing user points
import { createPointsMilestoneNotification } from './notifications';

/**
 * Check if we need to reset monthly stats
 * @param {Date} lastReset - Last monthly reset date
 * @returns {boolean} - True if we need to reset
 */
export function shouldResetMonthlyStats(lastReset) {
  if (!lastReset) return true;

  const now = new Date();
  const lastResetDate = new Date(lastReset);

  // Check if we're in a different month
  return (
    now.getMonth() !== lastResetDate.getMonth() ||
    now.getFullYear() !== lastResetDate.getFullYear()
  );
}

/**
 * Update user points
 * @param {Object} user - User document
 * @param {Object} activity - Activity data
 * @param {number} activity.points - Points earned from this activity
 * @returns {Object} - Updated user data
 */
export async function updateUserPointsAndStreak(user, activity) {
  const now = new Date();

  // Reset monthly stats if needed
  if (shouldResetMonthlyStats(user.lastMonthlyReset)) {
    user.monthlyPoints = 0;
    user.lastMonthlyReset = now;
  }

  // Update points
  const oldPoints = user.points || 0;
  if (activity.points) {
    user.points = Math.max(0, oldPoints + activity.points);
    user.monthlyPoints = Math.max(0, (user.monthlyPoints || 0) + activity.points);

    // Create notification for points milestones (fire and forget - don't await)
    const newPoints = user.points;
    if (oldPoints < 100 && newPoints >= 100) {
      // User just reached 100 points
      createPointsMilestoneNotification(user._id.toString(), 100).catch(err => {
        console.error('Failed to create milestone notification:', err);
      });
    } else {
      // Check for other milestones (500, 1000, etc.)
      createPointsMilestoneNotification(user._id.toString(), newPoints).catch(err => {
        console.error('Failed to create milestone notification:', err);
      });
    }
  }

  return user;
}

/**
 * Calculate points based on activity
 * @param {Object} activityData - Activity data
 * @param {number} activityData.sentencesCompleted - Number of sentences completed
 * @param {number} activityData.lessonsCompleted - Number of lessons completed
 * @param {number} activityData.timeSpent - Time spent in seconds
 * @returns {number} - Points earned
 */
export function calculatePoints(activityData) {
  const { sentencesCompleted = 0, lessonsCompleted = 0, timeSpent = 0 } = activityData;

  // Points formula: sentences * 2 + lessons * 50 + time bonus
  let points = (sentencesCompleted * 2) + (lessonsCompleted * 50);

  // Time bonus: 1 point per 10 minutes studied
  const timeBonus = Math.floor(timeSpent / 600);
  points += timeBonus;

  return Math.max(0, points);
}

/**
 * Get user's current month stats
 * @param {Object} user - User document
 * @returns {Object} - Current month stats
 */
export function getCurrentMonthStats(user) {
  // Check if we need to reset
  if (shouldResetMonthlyStats(user.lastMonthlyReset)) {
    return {
      monthlyPoints: 0
    };
  }

  return {
    monthlyPoints: user.monthlyPoints || 0
  };
}
