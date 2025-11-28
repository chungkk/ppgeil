import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_STUDY_TIME = 24 * 60 * 60;
const DEBUG_TIMER = false;
const PAUSE_TIMEOUT_MS = 30000; // 30 seconds
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const SAVE_INTERVAL_MS = 3000; // 3 seconds

/**
 * Custom hook to manage study time tracking
 * @param {Object} options
 * @param {boolean} options.isPlaying - Whether media is currently playing
 * @param {Object|null} options.user - Current user object
 * @param {string} options.lessonId - Current lesson ID
 * @param {number} options.loadedStudyTime - Initial study time loaded from server
 * @param {string} options.mode - Study mode ('shadowing' or 'dictation')
 * @returns {Object} - { studyTime, isTimerRunning, progressLoaded }
 */
export const useStudyTimer = ({
  isPlaying,
  user,
  lessonId,
  loadedStudyTime,
  mode = 'shadowing'
}) => {
  // State
  const [studyTime, setStudyTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [lastPauseTime, setLastPauseTime] = useState(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Refs for timer management
  const timerIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const hasStartedTimerRef = useRef(false);
  
  // Refs for accessing current values in callbacks
  const studyTimeRef = useRef(studyTime);
  const lastPauseTimeRef = useRef(lastPauseTime);
  const isTimerRunningRef = useRef(isTimerRunning);

  // Keep refs in sync with state
  useEffect(() => {
    studyTimeRef.current = studyTime;
  }, [studyTime]);

  useEffect(() => {
    lastPauseTimeRef.current = lastPauseTime;
    isTimerRunningRef.current = isTimerRunning;
  }, [lastPauseTime, isTimerRunning]);

  // Save study time to server
  const saveStudyTime = useCallback(async () => {
    if (!user || !lessonId || !progressLoaded) return;
    
    const validatedStudyTime = Math.min(studyTimeRef.current, MAX_STUDY_TIME);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          mode,
          studyTime: validatedStudyTime
        })
      });
      
      if (DEBUG_TIMER) console.log('Study time saved:', validatedStudyTime);
    } catch (error) {
      console.error('Error saving study time:', error);
    }
  }, [user, lessonId, progressLoaded, mode]);

  // Start the timer interval
  const startTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) return;
    
    timerIntervalRef.current = setInterval(() => {
      setStudyTime(prev => {
        if (prev >= MAX_STUDY_TIME) {
          if (DEBUG_TIMER) console.log('Maximum study time reached');
          return MAX_STUDY_TIME;
        }
        if (DEBUG_TIMER) console.log('Timer tick:', prev + 1);
        return prev + 1;
      });
    }, 1000);
  }, []);

  // Stop the timer interval
  const stopTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Load initial study time from server
  useEffect(() => {
    if (loadedStudyTime !== undefined) {
      const validatedLoadedTime = Math.min(loadedStudyTime, MAX_STUDY_TIME);
      setStudyTime(validatedLoadedTime);
      if (DEBUG_TIMER) console.log('Loaded study time from SWR:', validatedLoadedTime);
      setProgressLoaded(true);
    }
  }, [loadedStudyTime]);

  // Main timer logic - handles play/pause state changes
  useEffect(() => {
    // First play - start timer
    if (isPlaying && !hasStartedTimerRef.current) {
      if (DEBUG_TIMER) console.log('Starting timer (first play)...');
      hasStartedTimerRef.current = true;
      setIsTimerRunning(true);
      setLastActivityTime(Date.now());
      setLastPauseTime(null);
      startTimerInterval();
      return;
    }

    // Paused - start pause timeout
    if (!isPlaying && hasStartedTimerRef.current && isTimerRunningRef.current && lastPauseTimeRef.current === null) {
      setLastPauseTime(Date.now());

      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }

      pauseTimeoutRef.current = setTimeout(() => {
        if (DEBUG_TIMER) console.log('Video paused for 30s, stopping timer');
        setIsTimerRunning(false);
        stopTimerInterval();
        saveStudyTime();
      }, PAUSE_TIMEOUT_MS);
      return;
    }

    // Resume after pause
    if (isPlaying && lastPauseTimeRef.current !== null && !isTimerRunningRef.current && hasStartedTimerRef.current) {
      if (DEBUG_TIMER) console.log('Resuming timer after pause');
      
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }

      setLastPauseTime(null);
      setIsTimerRunning(true);
      setLastActivityTime(Date.now());
      startTimerInterval();
    }
  }, [isPlaying, startTimerInterval, stopTimerInterval, saveStudyTime]);

  // Inactivity detection - stop timer after 3 minutes of no activity
  useEffect(() => {
    if (!isTimerRunning) return;

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      if (DEBUG_TIMER) console.log('User inactive for 3 minutes, stopping timer');
      setIsTimerRunning(false);
      stopTimerInterval();
      saveStudyTime();
    }, INACTIVITY_TIMEOUT_MS);

    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [lastActivityTime, isTimerRunning, stopTimerInterval, saveStudyTime]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now());
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, []);

  // Periodic save and cleanup
  useEffect(() => {
    const interval = setInterval(saveStudyTime, SAVE_INTERVAL_MS);

    const handleBeforeUnload = () => {
      saveStudyTime();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveStudyTime();
    };
  }, [saveStudyTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (DEBUG_TIMER) console.log('Cleaning up timer on unmount');
      stopTimerInterval();
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [stopTimerInterval]);

  return {
    studyTime,
    isTimerRunning,
    progressLoaded
  };
};

export default useStudyTimer;
