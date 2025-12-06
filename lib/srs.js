/**
 * Spaced Repetition System (SRS) - Anki-style SM-2 Algorithm
 * 
 * Card states:
 * - NEW: Never seen before
 * - LEARNING: In learning steps (e.g., 1m, 10m)
 * - REVIEW: Graduated, using intervals
 * - RELEARNING: Failed review, back to learning
 * 
 * Rating:
 * - AGAIN (1): Complete blackout, reset
 * - HARD (2): Struggled, shorter interval
 * - GOOD (3): Correct with effort
 * - EASY (4): Instant recall
 */

// Constants - Anki defaults
export const SRS_CONFIG = {
  // Learning steps in minutes
  LEARNING_STEPS: [1, 10],
  
  // Graduating interval (days) - when card leaves learning
  GRADUATING_INTERVAL: 1,
  
  // Easy interval (days) - when pressing Easy on new card
  EASY_INTERVAL: 4,
  
  // Relearning steps in minutes
  RELEARNING_STEPS: [10],
  
  // Starting ease factor (2.5 = 250%)
  STARTING_EASE: 2.5,
  
  // Minimum ease factor
  MIN_EASE: 1.3,
  
  // Ease modifiers
  EASE_AGAIN: -0.2,    // Decrease ease by 20%
  EASE_HARD: -0.15,    // Decrease ease by 15%
  EASE_EASY: 0.15,     // Increase ease by 15%
  
  // Interval modifiers
  HARD_INTERVAL: 1.2,  // 120% of current interval
  
  // Maximum interval (days)
  MAX_INTERVAL: 36500, // 100 years
  
  // New cards per day limit
  NEW_CARDS_PER_DAY: 20,
  
  // Review cards per day limit
  REVIEWS_PER_DAY: 200
};

// Card states
export const CardState = {
  NEW: 'new',
  LEARNING: 'learning',
  REVIEW: 'review',
  RELEARNING: 'relearning'
};

// Rating values
export const Rating = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4
};

/**
 * Create a new SRS card data object
 */
export function createNewCard(word) {
  return {
    word,
    state: CardState.NEW,
    ease: SRS_CONFIG.STARTING_EASE,
    interval: 0,           // Days
    stepIndex: 0,          // Current learning step
    due: new Date(),       // When card is due
    reviews: 0,            // Total review count
    lapses: 0,             // Times forgotten (pressed Again on review)
    lastReview: null,
    createdAt: new Date()
  };
}

/**
 * Calculate next review based on rating
 * Returns updated card data and next due date
 */
export function calculateNextReview(card, rating) {
  const now = new Date();
  const updatedCard = { ...card };
  updatedCard.reviews += 1;
  updatedCard.lastReview = now;

  switch (card.state) {
    case CardState.NEW:
    case CardState.LEARNING:
      return handleLearningCard(updatedCard, rating);
    
    case CardState.REVIEW:
      return handleReviewCard(updatedCard, rating);
    
    case CardState.RELEARNING:
      return handleRelearningCard(updatedCard, rating);
    
    default:
      return handleLearningCard(updatedCard, rating);
  }
}

/**
 * Handle NEW or LEARNING cards
 */
function handleLearningCard(card, rating) {
  const now = new Date();
  const steps = SRS_CONFIG.LEARNING_STEPS;

  switch (rating) {
    case Rating.AGAIN:
      // Reset to first step
      card.stepIndex = 0;
      card.state = CardState.LEARNING;
      card.due = addMinutes(now, steps[0]);
      break;

    case Rating.HARD:
      // Repeat current step (or stay at first if already at first)
      card.state = CardState.LEARNING;
      const currentStep = steps[Math.min(card.stepIndex, steps.length - 1)];
      card.due = addMinutes(now, currentStep);
      break;

    case Rating.GOOD:
      // Move to next step or graduate
      if (card.stepIndex >= steps.length - 1) {
        // Graduate to review
        card.state = CardState.REVIEW;
        card.interval = SRS_CONFIG.GRADUATING_INTERVAL;
        card.due = addDays(now, card.interval);
      } else {
        // Next learning step
        card.stepIndex += 1;
        card.state = CardState.LEARNING;
        card.due = addMinutes(now, steps[card.stepIndex]);
      }
      break;

    case Rating.EASY:
      // Graduate immediately with easy interval
      card.state = CardState.REVIEW;
      card.interval = SRS_CONFIG.EASY_INTERVAL;
      card.ease = Math.min(card.ease + SRS_CONFIG.EASE_EASY, 3.0);
      card.due = addDays(now, card.interval);
      break;
  }

  return card;
}

/**
 * Handle REVIEW cards (graduated cards)
 */
function handleReviewCard(card, rating) {
  const now = new Date();

  switch (rating) {
    case Rating.AGAIN:
      // Lapse - back to relearning
      card.lapses += 1;
      card.state = CardState.RELEARNING;
      card.stepIndex = 0;
      card.ease = Math.max(card.ease + SRS_CONFIG.EASE_AGAIN, SRS_CONFIG.MIN_EASE);
      card.due = addMinutes(now, SRS_CONFIG.RELEARNING_STEPS[0]);
      // Interval will be set when graduating from relearning
      break;

    case Rating.HARD:
      // Shorter interval, reduce ease
      card.ease = Math.max(card.ease + SRS_CONFIG.EASE_HARD, SRS_CONFIG.MIN_EASE);
      card.interval = Math.max(
        card.interval + 1,
        Math.round(card.interval * SRS_CONFIG.HARD_INTERVAL)
      );
      card.interval = Math.min(card.interval, SRS_CONFIG.MAX_INTERVAL);
      card.due = addDays(now, card.interval);
      break;

    case Rating.GOOD:
      // Normal interval with ease
      card.interval = Math.round(card.interval * card.ease);
      card.interval = Math.min(card.interval, SRS_CONFIG.MAX_INTERVAL);
      card.due = addDays(now, card.interval);
      break;

    case Rating.EASY:
      // Longer interval, increase ease
      card.ease = Math.min(card.ease + SRS_CONFIG.EASE_EASY, 3.0);
      card.interval = Math.round(card.interval * card.ease * 1.3);
      card.interval = Math.min(card.interval, SRS_CONFIG.MAX_INTERVAL);
      card.due = addDays(now, card.interval);
      break;
  }

  return card;
}

/**
 * Handle RELEARNING cards (failed reviews)
 */
function handleRelearningCard(card, rating) {
  const now = new Date();
  const steps = SRS_CONFIG.RELEARNING_STEPS;

  switch (rating) {
    case Rating.AGAIN:
      // Reset to first relearning step
      card.stepIndex = 0;
      card.due = addMinutes(now, steps[0]);
      break;

    case Rating.HARD:
      // Repeat current step
      const currentStep = steps[Math.min(card.stepIndex, steps.length - 1)];
      card.due = addMinutes(now, currentStep);
      break;

    case Rating.GOOD:
      // Graduate back to review
      if (card.stepIndex >= steps.length - 1) {
        card.state = CardState.REVIEW;
        // New interval is reduced after lapse
        card.interval = Math.max(1, Math.round(card.interval * 0.5));
        card.due = addDays(now, card.interval);
      } else {
        card.stepIndex += 1;
        card.due = addMinutes(now, steps[card.stepIndex]);
      }
      break;

    case Rating.EASY:
      // Graduate immediately with slightly better interval
      card.state = CardState.REVIEW;
      card.interval = Math.max(1, Math.round(card.interval * 0.7));
      card.due = addDays(now, card.interval);
      break;
  }

  return card;
}

/**
 * Get display text for next review time
 */
export function getNextReviewText(card, rating, language = 'vi') {
  const tempCard = calculateNextReview({ ...card }, rating);
  const now = new Date();
  const due = new Date(tempCard.due);
  
  const diffMs = due - now;
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return language === 'vi' ? `${diffMins}p` : `${diffMins}m`;
  } else if (diffMins < 1440) { // Less than 1 day
    const hours = Math.round(diffMins / 60);
    return language === 'vi' ? `${hours}g` : `${hours}h`;
  } else if (diffDays < 30) {
    return language === 'vi' ? `${diffDays}n` : `${diffDays}d`;
  } else if (diffDays < 365) {
    const months = Math.round(diffDays / 30);
    return language === 'vi' ? `${months}th` : `${months}mo`;
  } else {
    const years = (diffDays / 365).toFixed(1);
    return language === 'vi' ? `${years}n` : `${years}y`;
  }
}

/**
 * Get all next review times for display
 */
export function getAllNextReviewTexts(card, language = 'vi') {
  return {
    again: getNextReviewText(card, Rating.AGAIN, language),
    hard: getNextReviewText(card, Rating.HARD, language),
    good: getNextReviewText(card, Rating.GOOD, language),
    easy: getNextReviewText(card, Rating.EASY, language)
  };
}

/**
 * Sort cards into queues for study session
 */
export function buildStudyQueue(cards, options = {}) {
  const {
    newCardsLimit = SRS_CONFIG.NEW_CARDS_PER_DAY,
    reviewsLimit = SRS_CONFIG.REVIEWS_PER_DAY
  } = options;

  const now = new Date();
  
  // Separate cards by type
  const newCards = [];
  const learningCards = [];
  const reviewCards = [];

  cards.forEach(card => {
    if (card.state === CardState.NEW && card.reviews === 0) {
      newCards.push(card);
    } else if (card.state === CardState.LEARNING || card.state === CardState.RELEARNING) {
      // Learning cards due now
      if (new Date(card.due) <= now) {
        learningCards.push(card);
      }
    } else if (card.state === CardState.REVIEW) {
      // Review cards due today
      if (new Date(card.due) <= now) {
        reviewCards.push(card);
      }
    }
  });

  // Sort learning cards by due date (most urgent first)
  learningCards.sort((a, b) => new Date(a.due) - new Date(b.due));

  // Shuffle new cards for variety
  shuffleArray(newCards);

  // Sort review cards by due date
  reviewCards.sort((a, b) => new Date(a.due) - new Date(b.due));

  return {
    newCards: newCards.slice(0, newCardsLimit),
    learningCards,
    reviewCards: reviewCards.slice(0, reviewsLimit),
    counts: {
      new: Math.min(newCards.length, newCardsLimit),
      learning: learningCards.length,
      review: Math.min(reviewCards.length, reviewsLimit),
      totalNew: newCards.length,
      totalDue: reviewCards.length
    }
  };
}

/**
 * Get next card to study from queue
 * Priority: Learning > Review > New (interleaved)
 */
export function getNextStudyCard(queue, studiedInSession = { new: 0, review: 0 }) {
  const { newCards, learningCards, reviewCards, counts } = queue;
  const now = new Date();

  // 1. Learning cards first (if due now)
  const dueLearning = learningCards.find(c => new Date(c.due) <= now);
  if (dueLearning) {
    return { card: dueLearning, type: 'learning' };
  }

  // 2. Interleave new and review cards
  // Ratio: roughly 1 new : 5 review (if available)
  const newStudied = studiedInSession.new || 0;
  const reviewStudied = studiedInSession.review || 0;
  
  const shouldShowNew = newCards.length > 0 && 
    (reviewCards.length === 0 || (reviewStudied >= 5 * newStudied && reviewStudied > 0) || newStudied === 0);

  if (shouldShowNew && newCards.length > 0) {
    return { card: newCards[0], type: 'new' };
  }

  if (reviewCards.length > 0) {
    return { card: reviewCards[0], type: 'review' };
  }

  if (newCards.length > 0) {
    return { card: newCards[0], type: 'new' };
  }

  // No cards left
  return null;
}

// Helper functions
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Calculate statistics for a deck
 */
export function calculateDeckStats(cards) {
  const now = new Date();
  const stats = {
    total: cards.length,
    new: 0,
    learning: 0,
    review: 0,
    dueToday: 0,
    mature: 0,        // Cards with interval >= 21 days
    young: 0,         // Cards with interval < 21 days
    averageEase: 0,
    averageInterval: 0,
    retention: 0      // Success rate
  };

  let totalEase = 0;
  let totalInterval = 0;
  let reviewedCards = 0;
  let successfulReviews = 0;

  cards.forEach(card => {
    if (card.state === CardState.NEW && card.reviews === 0) {
      stats.new++;
    } else if (card.state === CardState.LEARNING || card.state === CardState.RELEARNING) {
      stats.learning++;
    } else {
      stats.review++;
    }

    if (new Date(card.due) <= now) {
      stats.dueToday++;
    }

    if (card.interval >= 21) {
      stats.mature++;
    } else if (card.interval > 0) {
      stats.young++;
    }

    if (card.reviews > 0) {
      totalEase += card.ease;
      totalInterval += card.interval;
      reviewedCards++;
      successfulReviews += (card.reviews - card.lapses);
    }
  });

  if (reviewedCards > 0) {
    stats.averageEase = (totalEase / reviewedCards).toFixed(2);
    stats.averageInterval = Math.round(totalInterval / reviewedCards);
    const totalReviewAttempts = cards.reduce((sum, c) => sum + c.reviews, 0);
    if (totalReviewAttempts > 0) {
      stats.retention = Math.round((successfulReviews / totalReviewAttempts) * 100);
    }
  }

  return stats;
}
