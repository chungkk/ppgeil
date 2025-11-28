/**
 * Haptic Feedback Utility for Mobile Devices
 * Provides tactile feedback for better user engagement
 * 
 * Supports:
 * - iOS: Haptic Feedback API (iPhone 7+)
 * - Android: Vibration API
 * - Fallback for older devices
 * 
 * @module haptics
 */

/**
 * Check if haptic feedback is supported
 * @returns {boolean}
 */
export const isHapticSupported = () => {
  // Check for iOS Haptic Engine (iPhone 7+, iOS 10+)
  if (typeof window !== 'undefined' && window.navigator && 'vibrate' in window.navigator) {
    return true;
  }
  
  // Check for older iOS devices (might not have vibrate but have taptic engine)
  if (typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return true; // iOS devices generally support some form of haptics
  }
  
  return false;
};

/**
 * Check if user has enabled haptics in localStorage
 * @returns {boolean}
 */
export const isHapticEnabled = () => {
  if (typeof window === 'undefined') return true; // Default to enabled
  
  const setting = localStorage.getItem('hapticEnabled');
  // Default to true if not set
  return setting === null ? true : setting === 'true';
};

/**
 * Toggle haptic setting
 * @param {boolean} enabled
 */
export const setHapticEnabled = (enabled) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hapticEnabled', String(enabled));
  }
};

/**
 * Vibrate device with pattern or duration
 * @param {number|number[]} pattern - Duration in ms or pattern array
 */
const vibrate = (pattern) => {
  if (!isHapticSupported() || !isHapticEnabled()) {
    return;
  }
  
  try {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
  }
};

/**
 * Light tap - for button presses, input focus
 * Duration: 10ms
 */
export const hapticLight = () => {
  vibrate(10);
};

/**
 * Medium tap - for successful actions, correct answers
 * Duration: 20ms
 */
export const hapticMedium = () => {
  vibrate(20);
};

/**
 * Heavy tap - for important events, sentence completion
 * Duration: 30ms
 */
export const hapticHeavy = () => {
  vibrate(30);
};

/**
 * Error feedback - double tap for mistakes
 * Pattern: [duration, pause, duration]
 */
export const hapticError = () => {
  vibrate([15, 10, 15]);
};

/**
 * Success feedback - celebration pattern for achievements
 * Pattern: short-short-long
 */
export const hapticSuccess = () => {
  vibrate([10, 50, 10, 50, 30]);
};

/**
 * Selection changed - subtle feedback for swipes/navigation
 * Duration: 5ms (very light)
 */
export const hapticSelection = () => {
  vibrate(5);
};

/**
 * Notification - attention-grabbing pattern
 * Pattern: long-pause-long
 */
export const hapticNotification = () => {
  vibrate([30, 100, 30]);
};

/**
 * Impact - for collisions, drag & drop
 * Duration: 15ms
 */
export const hapticImpact = () => {
  vibrate(15);
};

/**
 * Pattern: Custom celebration for streak milestones
 * Pattern: ascending intensity
 */
export const hapticCelebration = () => {
  vibrate([10, 30, 15, 30, 20, 30, 30]);
};

/**
 * Haptic feedback for specific dictation events
 */
export const hapticEvents = {
  // Word input
  wordCorrect: hapticMedium,           // ✅ Correct word typed
  wordIncorrect: hapticError,          // ❌ Wrong word
  wordHintUsed: hapticLight,           // 💡 Hint button clicked
  
  // Sentence events
  sentenceComplete: hapticSuccess,     // 🎉 Sentence finished
  sentenceSkipped: hapticLight,        // ⏭️ Next sentence
  
  // Navigation
  slideSwipe: hapticSelection,         // 👆 Swipe left/right
  dotClick: hapticLight,               // 🔵 Progress dot clicked
  buttonPress: hapticLight,            // 🔘 Any button press
  
  // Achievements
  streakMilestone: hapticCelebration,  // 🔥 Streak achievement
  lessonComplete: hapticSuccess,       // 🎓 Lesson finished
  levelUp: hapticHeavy,                // ⬆️ Level up
  
  // Interactions
  inputFocus: hapticLight,             // 📝 Input field focused
  toggleSwitch: hapticMedium,          // 🔄 Toggle changed
  menuOpen: hapticLight,               // 📋 Menu opened
  
  // Errors & warnings
  errorOccurred: hapticError,          // ⚠️ Error message
  warningShown: hapticMedium,          // 🚧 Warning displayed
  
  // Audio controls
  audioPlay: hapticLight,              // ▶️ Play pressed
  audioPause: hapticLight,             // ⏸️ Pause pressed
  audioSeek: hapticSelection,          // ⏩ Seeking audio
};

/**
 * Apply haptic to an element's click event
 * Usage: <button onClick={withHaptic(() => doSomething())}>Click</button>
 * 
 * @param {Function} callback - Function to execute
 * @param {Function} hapticFn - Haptic function to call (default: hapticLight)
 * @returns {Function}
 */
export const withHaptic = (callback, hapticFn = hapticLight) => {
  return (...args) => {
    hapticFn();
    return callback(...args);
  };
};

/**
 * React Hook for haptic feedback
 * Usage in component:
 * 
 * const { triggerHaptic, hapticEnabled, toggleHaptic } = useHaptic();
 * 
 * <button onClick={() => triggerHaptic('medium')}>Click me</button>
 * 
 * @returns {Object}
 */
export const useHaptic = () => {
  const [enabled, setEnabled] = React.useState(isHapticEnabled());
  
  const triggerHaptic = (type = 'light') => {
    if (!enabled) return;
    
    switch (type) {
      case 'light':
        hapticLight();
        break;
      case 'medium':
        hapticMedium();
        break;
      case 'heavy':
        hapticHeavy();
        break;
      case 'error':
        hapticError();
        break;
      case 'success':
        hapticSuccess();
        break;
      case 'selection':
        hapticSelection();
        break;
      case 'notification':
        hapticNotification();
        break;
      case 'impact':
        hapticImpact();
        break;
      case 'celebration':
        hapticCelebration();
        break;
      default:
        hapticLight();
    }
  };
  
  const toggleHaptic = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    setHapticEnabled(newValue);
  };
  
  return {
    triggerHaptic,
    hapticEnabled: enabled,
    toggleHaptic,
    isSupported: isHapticSupported()
  };
};

const haptics = {
  isHapticSupported,
  isHapticEnabled,
  setHapticEnabled,
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticError,
  hapticSuccess,
  hapticSelection,
  hapticNotification,
  hapticImpact,
  hapticCelebration,
  hapticEvents,
  withHaptic,
  useHaptic
};

export default haptics;
