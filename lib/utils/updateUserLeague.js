/**
 * Utility to update user's league based on their points
 * Should be called whenever user's points change
 */

import { LEAGUES, getLeagueByPoints } from '../constants/leagues';

/**
 * Update user's currentLeague field based on their total points
 * @param {Object} user - Mongoose user document
 * @param {number} newPoints - New total points (optional, uses user.points if not provided)
 * @returns {Promise<boolean>} - Whether league changed
 */
export async function updateUserLeague(user, newPoints = null) {
  const points = newPoints ?? user.points ?? 0;
  const currentLeague = user.currentLeague || 'bronze';
  const newLeague = getLeagueByPoints(points);

  if (currentLeague !== newLeague) {
    user.currentLeague = newLeague;
    await user.save();
    return true;
  }

  return false;
}

/**
 * Check if user qualifies for a league change
 * @param {number} points - User's current points
 * @param {string} currentLeague - User's current league
 * @returns {Object} - League change info
 */
export function checkLeagueChange(points, currentLeague) {
  const newLeague = getLeagueByPoints(points);
  const currentLeagueInfo = LEAGUES[currentLeague] || LEAGUES.bronze;
  const newLeagueInfo = LEAGUES[newLeague] || LEAGUES.bronze;

  if (currentLeague === newLeague) {
    // Calculate progress to next league
    const leagueOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIdx = leagueOrder.indexOf(currentLeague);
    const nextLeague = currentIdx < leagueOrder.length - 1 ? leagueOrder[currentIdx + 1] : null;
    
    let progressToNext = 0;
    let pointsToNext = 0;
    
    if (nextLeague) {
      const nextLeagueInfo = LEAGUES[nextLeague];
      const range = nextLeagueInfo.min - currentLeagueInfo.min;
      const progress = points - currentLeagueInfo.min;
      progressToNext = Math.min(100, Math.round((progress / range) * 100));
      pointsToNext = nextLeagueInfo.min - points;
    } else {
      progressToNext = 100; // Max league
    }

    return {
      changed: false,
      currentLeague,
      newLeague: null,
      direction: null,
      progressToNext,
      pointsToNext
    };
  }

  // Determine if promoted or demoted
  const leagueOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const oldIdx = leagueOrder.indexOf(currentLeague);
  const newIdx = leagueOrder.indexOf(newLeague);
  const direction = newIdx > oldIdx ? 'promoted' : 'demoted';

  return {
    changed: true,
    currentLeague,
    newLeague,
    direction,
    newLeagueInfo,
    progressToNext: 0,
    pointsToNext: 0
  };
}

/**
 * Middleware-style function to update league after points change
 * Can be used in API routes after adding points
 * @param {string} userId - User ID
 * @param {number} newPoints - New total points after change
 */
export async function updateUserLeagueById(userId, newPoints) {
  // Dynamic import to avoid circular dependencies
  const User = (await import('../../models/User')).default;
  
  const user = await User.findById(userId);
  if (!user) return null;

  const oldLeague = user.currentLeague || 'bronze';
  const newLeague = getLeagueByPoints(newPoints);

  if (oldLeague !== newLeague) {
    user.currentLeague = newLeague;
    user.points = newPoints;
    await user.save();
    
    return {
      userId,
      oldLeague,
      newLeague,
      direction: ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(newLeague) >
                 ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(oldLeague) 
                 ? 'promoted' : 'demoted'
    };
  }

  return null;
}

export default updateUserLeague;
