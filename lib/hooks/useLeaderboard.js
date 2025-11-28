import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for managing leaderboard tracking
 * Tracks session time, sentences completed, and updates monthly stats
 */
const useLeaderboard = ({ user, currentSentenceIndex, transcriptData }) => {
  const sessionStartTimeRef = useRef(Date.now());
  const completedSentencesForLeaderboardRef = useRef(new Set());
  const lastStatsUpdateRef = useRef(Date.now());

  // Update monthly leaderboard stats
  const updateMonthlyStats = useCallback(async (forceUpdate = false) => {
    if (!user) return;

    const now = Date.now();
    const timeSinceLastUpdate = (now - lastStatsUpdateRef.current) / 1000;

    if (!forceUpdate && timeSinceLastUpdate < 60) return;

    const totalTimeSpent = Math.floor((now - sessionStartTimeRef.current) / 1000);
    const newSentencesCompleted = completedSentencesForLeaderboardRef.current.size;

    if (totalTimeSpent < 10 && newSentencesCompleted === 0 && !forceUpdate) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      await fetch('/api/leaderboard/update-monthly-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timeSpent: totalTimeSpent,
          sentencesCompleted: newSentencesCompleted,
          lessonsCompleted: 0
        })
      });

      sessionStartTimeRef.current = now;
      completedSentencesForLeaderboardRef.current.clear();
      lastStatsUpdateRef.current = now;
    } catch (error) {
      console.error('Error updating monthly stats:', error);
    }
  }, [user]);

  // Track sentence completion for leaderboard
  useEffect(() => {
    if (currentSentenceIndex >= 0 && transcriptData[currentSentenceIndex]) {
      completedSentencesForLeaderboardRef.current.add(currentSentenceIndex);
    }
  }, [currentSentenceIndex, transcriptData]);

  // Periodic stats update (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      updateMonthlyStats(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateMonthlyStats]);

  // Save stats on unmount and page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateMonthlyStats(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateMonthlyStats(true);
    };
  }, [updateMonthlyStats]);

  return {
    updateMonthlyStats,
    sessionStartTime: sessionStartTimeRef.current
  };
};

export default useLeaderboard;
