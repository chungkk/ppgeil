/**
 * Text Similarity Utilities
 * Calculate similarity between two texts for speech recognition comparison
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize text for comparison
 * - Convert to lowercase
 * - Remove extra whitespace
 * - Remove punctuation
 * - Normalize German special characters
 * @param {string} text - Text to normalize
 * @returns {string} - Normalized text
 */
export function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    // Remove punctuation but keep letters and spaces
    .replace(/[^\wäöüß\s]/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Calculate similarity percentage between two texts
 * @param {string} text1 - Original text
 * @param {string} text2 - Recognized text
 * @returns {number} - Similarity percentage (0-100)
 */
export function calculateSimilarity(text1, text2) {
  // Normalize both texts
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  // Handle empty strings
  if (!normalized1 && !normalized2) return 100;
  if (!normalized1 || !normalized2) return 0;

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  // Calculate similarity percentage
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.max(0, Math.min(100, similarity));
}

/**
 * Compare words and find matches
 * @param {string} originalText - Original sentence
 * @param {string} spokenText - Spoken/recognized text
 * @returns {Object} - Comparison result with detailed info
 */
export function compareTexts(originalText, spokenText) {
  const original = normalizeText(originalText);
  const spoken = normalizeText(spokenText);

  const originalWords = original.split(' ').filter(w => w.length > 0);
  const spokenWords = spoken.split(' ').filter(w => w.length > 0);

  // Calculate word-level matches
  let matchedWords = 0;
  const wordMatches = [];

  originalWords.forEach((originalWord, i) => {
    // Find closest match in spoken words
    let bestMatch = null;
    let bestSimilarity = 0;

    spokenWords.forEach((spokenWord, j) => {
      const wordSimilarity = calculateSimilarity(originalWord, spokenWord);
      if (wordSimilarity > bestSimilarity) {
        bestSimilarity = wordSimilarity;
        bestMatch = { word: spokenWord, index: j, similarity: wordSimilarity };
      }
    });

    // Count as matched if similarity > 70%
    if (bestMatch && bestSimilarity > 70) {
      matchedWords++;
      wordMatches.push({
        original: originalWord,
        spoken: bestMatch.word,
        similarity: bestSimilarity,
        matched: true
      });
    } else {
      wordMatches.push({
        original: originalWord,
        spoken: bestMatch?.word || '',
        similarity: bestSimilarity,
        matched: false
      });
    }
  });

  // Calculate overall similarity
  const overallSimilarity = calculateSimilarity(original, spoken);

  // Calculate word accuracy
  const wordAccuracy = originalWords.length > 0
    ? (matchedWords / originalWords.length) * 100
    : 0;

  return {
    overallSimilarity: Math.round(overallSimilarity * 10) / 10,
    wordAccuracy: Math.round(wordAccuracy * 10) / 10,
    matchedWords,
    totalWords: originalWords.length,
    wordMatches,
    isPassed: overallSimilarity >= 80
  };
}

/**
 * Get score based on similarity
 * @param {number} similarity - Similarity percentage (0-100)
 * @returns {number} - Score (+1 for >= 80%, -0.5 for < 80%)
 */
export function getSimilarityScore(similarity) {
  return similarity >= 80 ? 1 : -0.5;
}

/**
 * Get feedback message based on similarity
 * @param {number} similarity - Similarity percentage (0-100)
 * @param {string} language - Language code ('de' or 'vi')
 * @returns {string} - Feedback message
 */
export function getSimilarityFeedback(similarity, language = 'de') {
  const messages = {
    de: {
      excellent: 'Ausgezeichnet! Perfekte Aussprache!',
      great: 'Sehr gut! Fast perfekt!',
      good: 'Gut gemacht!',
      fair: 'Nicht schlecht, aber du kannst es besser!',
      poor: 'Versuche es noch einmal!'
    },
    vi: {
      excellent: 'Xuất sắc! Phát âm hoàn hảo!',
      great: 'Rất tốt! Gần như hoàn hảo!',
      good: 'Tốt lắm!',
      fair: 'Không tệ, nhưng bạn có thể làm tốt hơn!',
      poor: 'Hãy thử lại!'
    }
  };

  const lang = messages[language] || messages.vi;

  if (similarity >= 95) return lang.excellent;
  if (similarity >= 85) return lang.great;
  if (similarity >= 80) return lang.good;
  if (similarity >= 60) return lang.fair;
  return lang.poor;
}
