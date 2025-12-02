import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AnswerStreakContext = createContext();

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Bonus multiplier based on streak level
export const getStreakMultiplier = (streak) => {
  if (streak >= 15) return 2.5;
  if (streak >= 10) return 2.0;
  if (streak >= 5) return 1.5;
  return 1.0;
};

// Get streak level info for display
export const getStreakLevel = (streak) => {
  if (streak >= 15) return { level: 'legendary', color: '#FF4500', label: 'Legendary!' };
  if (streak >= 10) return { level: 'fire', color: '#FF6B35', label: 'On Fire!' };
  if (streak >= 5) return { level: 'hot', color: '#FFD700', label: 'Hot!' };
  if (streak > 0) return { level: 'normal', color: '#4CAF50', label: '' };
  return { level: 'none', color: '#888', label: '' };
};

// Check if streak is a milestone (5, 10, 15, 20, etc.)
export const isStreakMilestone = (streak) => {
  return streak > 0 && streak % 5 === 0;
};

export function AnswerStreakProvider({ children }) {
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lastAnswerTime, setLastAnswerTime] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);

  // Fetch streak data from server
  const fetchStreakData = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      const res = await fetch('/api/user/answer-streak', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentStreak(data.current || 0);
        setMaxStreak(data.max || 0);
        setLastAnswerTime(data.lastAnswerTime ? new Date(data.lastAnswerTime) : null);
      }
    } catch (error) {
      console.error('Error fetching streak data:', error);
    }
  }, [user]);

  // Check session timeout
  const checkSessionTimeout = useCallback(() => {
    if (lastAnswerTime) {
      const timeSinceLastAnswer = Date.now() - new Date(lastAnswerTime).getTime();
      if (timeSinceLastAnswer > SESSION_TIMEOUT && currentStreak > 0) {
        setCurrentStreak(0);
        return true;
      }
    }
    return false;
  }, [lastAnswerTime, currentStreak]);

  // Increment streak on correct answer
  const incrementStreak = useCallback(async () => {
    if (!user) return { multiplier: 1.0, newStreak: 0 };

    // Check session timeout first
    if (checkSessionTimeout()) {
      // Session expired, start fresh
    }

    const newStreak = currentStreak + 1;
    const multiplier = getStreakMultiplier(newStreak);
    const now = new Date();

    setCurrentStreak(newStreak);
    setLastAnswerTime(now);

    // Update max streak if needed
    if (newStreak > maxStreak) {
      setMaxStreak(newStreak);
    }

    // Show celebration for milestones
    if (isStreakMilestone(newStreak)) {
      setCelebrationStreak(newStreak);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }

    // Sync to server
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        await fetch('/api/user/answer-streak', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'increment',
            currentStreak: newStreak,
            maxStreak: Math.max(newStreak, maxStreak)
          })
        });
      }
    } catch (error) {
      console.error('Error syncing streak:', error);
    }

    return { multiplier, newStreak };
  }, [user, currentStreak, maxStreak, checkSessionTimeout]);

  // Reset streak on wrong answer
  const resetStreak = useCallback(async () => {
    if (!user) return;

    const previousStreak = currentStreak;
    setCurrentStreak(0);

    // Sync to server
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        await fetch('/api/user/answer-streak', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'reset',
            previousStreak
          })
        });
      }
    } catch (error) {
      console.error('Error resetting streak:', error);
    }

    return previousStreak;
  }, [user, currentStreak]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchStreakData();
    } else {
      setCurrentStreak(0);
      setMaxStreak(0);
      setLastAnswerTime(null);
    }
  }, [user, fetchStreakData]);

  // Sync across tabs using localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'answerStreak') {
        const data = JSON.parse(e.newValue || '{}');
        if (data.current !== undefined) setCurrentStreak(data.current);
        if (data.max !== undefined) setMaxStreak(data.max);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update localStorage when streak changes
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem('answerStreak', JSON.stringify({
        current: currentStreak,
        max: maxStreak,
        lastAnswerTime
      }));
    }
  }, [currentStreak, maxStreak, lastAnswerTime, user]);

  return (
    <AnswerStreakContext.Provider value={{
      currentStreak,
      maxStreak,
      lastAnswerTime,
      showCelebration,
      celebrationStreak,
      incrementStreak,
      resetStreak,
      fetchStreakData,
      getStreakMultiplier,
      getStreakLevel,
      isStreakMilestone
    }}>
      {children}
    </AnswerStreakContext.Provider>
  );
}

export function useAnswerStreak() {
  const context = useContext(AnswerStreakContext);
  if (!context) {
    throw new Error('useAnswerStreak must be used within AnswerStreakProvider');
  }
  return context;
}
