// API endpoint to generate word suggestions using AI
// Creates 2 distractor words similar to the correct word for multiple choice

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Validate if a word contains only valid German characters
 */
function isValidGermanWord(word) {
  // Must contain only German letters (including umlauts) and be at least 2 characters
  const germanWordPattern = /^[a-zA-ZäöüÄÖÜß]{2,}$/;
  return germanWordPattern.test(word);
}

/**
 * Generate word suggestions using OpenAI
 */
async function generateWithOpenAI(correctWord, context = '') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = context
    ? `You are a German language expert. Create 2 REAL German distractor words from the German dictionary for a dictation exercise.

Correct word: "${correctWord}"
Context: "${context}"

STRICT Requirements:
1. ONLY real German words that exist in the German dictionary (Duden)
2. NO made-up words, NO letter manipulations, NO nonsense words
3. Similar in length to "${correctWord}" (±1-3 letters)
4. Could potentially fit in the context
5. NOT the correct word or its obvious derivatives
6. Must be valid German nouns, verbs, adjectives, or adverbs

Return EXACTLY 2 real German words separated by comma, nothing else.
Example format: "Wort1, Wort2"`
    : `You are a German language expert. Create 2 REAL German distractor words from the German dictionary for a dictation exercise.

Correct word: "${correctWord}"

STRICT Requirements:
1. ONLY real German words that exist in the German dictionary (Duden)
2. NO made-up words, NO letter manipulations, NO nonsense words
3. Similar in length to "${correctWord}" (±1-3 letters)
4. Could be confused with "${correctWord}" (similar sound, spelling, or meaning)
5. NOT the correct word or its obvious derivatives (no plural/conjugation of the same word)
6. Must be valid German nouns, verbs, adjectives, or adverbs

Return EXACTLY 2 real German words separated by comma, nothing else.
Example format: "Wort1, Wort2"`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a native German language teacher with perfect knowledge of the German dictionary (Duden). You ONLY generate real German words that exist in standard German dictionaries. You NEVER create made-up or nonsensical words.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7, // Slightly lower for more consistent real words
      max_tokens: 50,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim();
  
  if (!content) {
    throw new Error('No content from OpenAI');
  }

  // Parse the response and validate
  const words = content
    .split(',')
    .map(w => w.trim())
    .filter(w => w && w.length > 0 && isValidGermanWord(w));
  
  if (words.length < 2) {
    console.warn('OpenAI generated insufficient valid German words:', content);
    throw new Error('Not enough valid German words generated');
  }

  return words.slice(0, 2);
}

/**
 * Generate word suggestions using Groq
 */
async function generateWithGroq(correctWord, context = '') {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const prompt = context
    ? `You are a German language expert. Create 2 REAL German distractor words from the German dictionary for a dictation exercise.

Correct word: "${correctWord}"
Context: "${context}"

STRICT Requirements:
1. ONLY real German words that exist in the German dictionary (Duden)
2. NO made-up words, NO letter manipulations, NO nonsense words
3. Similar in length to "${correctWord}" (±1-3 letters)
4. Could potentially fit in the context
5. NOT the correct word or its obvious derivatives
6. Must be valid German nouns, verbs, adjectives, or adverbs

Return EXACTLY 2 real German words separated by comma, nothing else.
Example format: "Wort1, Wort2"`
    : `You are a German language expert. Create 2 REAL German distractor words from the German dictionary for a dictation exercise.

Correct word: "${correctWord}"

STRICT Requirements:
1. ONLY real German words that exist in the German dictionary (Duden)
2. NO made-up words, NO letter manipulations, NO nonsense words
3. Similar in length to "${correctWord}" (±1-3 letters)
4. Could be confused with "${correctWord}" (similar sound, spelling, or meaning)
5. NOT the correct word or its obvious derivatives (no plural/conjugation of the same word)
6. Must be valid German nouns, verbs, adjectives, or adverbs

Return EXACTLY 2 real German words separated by comma, nothing else.
Example format: "Wort1, Wort2"`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a native German language teacher with perfect knowledge of the German dictionary (Duden). You ONLY generate real German words that exist in standard German dictionaries. You NEVER create made-up or nonsensical words.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    }),
  });

  if (!response.ok) {
    throw new Error('Groq API request failed');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim();
  
  if (!content) {
    throw new Error('No content from Groq');
  }

  // Parse the response and validate
  const words = content
    .split(',')
    .map(w => w.trim())
    .filter(w => w && w.length > 0 && isValidGermanWord(w));
  
  if (words.length < 2) {
    console.warn('Groq generated insufficient valid German words:', content);
    throw new Error('Not enough valid German words generated');
  }

  return words.slice(0, 2);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Remove duplicate words (case-insensitive) and ensure uniqueness
 */
function deduplicateWords(words) {
  const seen = new Set();
  return words.filter(word => {
    const normalized = word.toLowerCase().trim();
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

/**
 * Common German words categorized by length for fallback suggestions
 * These are real, commonly used German words from the dictionary
 */
const COMMON_GERMAN_WORDS = {
  short: ['ist', 'hat', 'war', 'zum', 'der', 'die', 'das', 'ein', 'mit', 'von', 'bei', 'auf', 'für', 'wir', 'sie', 'ich', 'uns', 'ihr', 'ihm', 'ihn', 'aus', 'vor', 'zur', 'vom', 'den', 'dem', 'des'],
  medium: ['aber', 'auch', 'oder', 'kann', 'muss', 'sein', 'sind', 'wird', 'wird', 'haben', 'dieser', 'jener', 'jetzt', 'hier', 'dort', 'mehr', 'sehr', 'ganz', 'weil', 'wenn', 'dass', 'nicht', 'noch', 'nach', 'dann', 'doch', 'etwa', 'über', 'unter', 'keine', 'einer', 'einem', 'einen', 'dieser', 'jedes', 'beide', 'wenig', 'vielen'],
  long: ['machen', 'können', 'müssen', 'werden', 'sollen', 'wollen', 'möchten', 'arbeiten', 'sprechen', 'kommen', 'gehen', 'sehen', 'hören', 'denken', 'glauben', 'wissen', 'fragen', 'sagen', 'zeigen', 'suchen', 'finden', 'nehmen', 'geben', 'bringen', 'fahren', 'laufen', 'spielen', 'lernen', 'verstehen', 'erklären', 'beginnen', 'helfen', 'kaufen', 'verkaufen'],
  veryLong: ['verstehen', 'erklären', 'beginnen', 'besuchen', 'bekommen', 'erhalten', 'versuchen', 'erreichen', 'bedeuten', 'entwickeln', 'entscheiden', 'vorschlagen', 'beschreiben', 'untersuchen', 'beobachten', 'erwarten', 'verändern', 'verbessern', 'antworten', 'unterstützen']
};

/**
 * Get word length category
 */
function getWordLengthCategory(wordLength) {
  if (wordLength <= 3) return 'short';
  if (wordLength <= 6) return 'medium';
  if (wordLength <= 9) return 'long';
  return 'veryLong';
}

/**
 * Generate fallback distractors using real common German words
 * Selects words from similar length category to maintain difficulty
 */
function generateFallbackDistractors(correctWord) {
  const correctWordLower = correctWord.toLowerCase();
  const targetLength = correctWord.length;
  const category = getWordLengthCategory(targetLength);
  
  // Get candidate words from the same category and adjacent categories
  const categories = ['short', 'medium', 'long', 'veryLong'];
  const currentIndex = categories.indexOf(category);
  
  let candidates = [...COMMON_GERMAN_WORDS[category]];
  
  // Add words from adjacent categories for more options
  if (currentIndex > 0) {
    candidates.push(...COMMON_GERMAN_WORDS[categories[currentIndex - 1]]);
  }
  if (currentIndex < categories.length - 1) {
    candidates.push(...COMMON_GERMAN_WORDS[categories[currentIndex + 1]]);
  }
  
  // Filter out the correct word and words that are too different in length
  const filtered = candidates.filter(word => {
    const wordLower = word.toLowerCase();
    const lengthDiff = Math.abs(word.length - targetLength);
    return wordLower !== correctWordLower && lengthDiff <= 3;
  });
  
  // Shuffle and take 2 unique words
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  const distractors = [];
  const seen = new Set([correctWordLower]);
  
  for (const word of shuffled) {
    const wordLower = word.toLowerCase();
    if (!seen.has(wordLower) && distractors.length < 2) {
      distractors.push(word);
      seen.add(wordLower);
    }
    if (distractors.length >= 2) break;
  }
  
  // If still not enough, add any remaining unique words
  if (distractors.length < 2) {
    for (const word of candidates) {
      const wordLower = word.toLowerCase();
      if (!seen.has(wordLower) && distractors.length < 2) {
        distractors.push(word);
        seen.add(wordLower);
      }
      if (distractors.length >= 2) break;
    }
  }
  
  return distractors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { correctWord, context = '' } = req.body;

    if (!correctWord) {
      return res.status(400).json({ message: 'correctWord is required' });
    }

    console.log(`Generating suggestions for: ${correctWord}`);

    let distractors = [];
    let method = 'none';

    // Try OpenAI first, then Groq
    try {
      if (OPENAI_API_KEY) {
        distractors = await generateWithOpenAI(correctWord, context);
        method = 'openai';
        console.log(`✅ OpenAI generated distractors:`, distractors);
      } else if (GROQ_API_KEY) {
        distractors = await generateWithGroq(correctWord, context);
        method = 'groq';
        console.log(`✅ Groq generated distractors:`, distractors);
      } else {
        throw new Error('No AI service configured');
      }
    } catch (error) {
      console.warn(`⚠️ AI generation failed for "${correctWord}": ${error.message}`);
      console.log(`🔄 Using fallback with real German words from dictionary...`);

      // Fallback to common German words from dictionary
      distractors = generateFallbackDistractors(correctWord);
      method = 'fallback';
      console.log(`✅ Fallback generated real German distractors:`, distractors);
    }

    // Create options array with correct word and distractors
    let options = [correctWord, ...distractors];
    const originalLength = options.length;

    // CRITICAL: Remove duplicates (case-insensitive)
    options = deduplicateWords(options);

    if (originalLength !== options.length) {
      console.log(`⚠️ Removed ${originalLength - options.length} duplicate(s) from suggestions`);
    }

    // Ensure we have at least 3 unique options
    // If AI/fallback didn't generate enough unique words, add more fallback options
    if (options.length < 3) {
      console.log(`⚠️ Need more options (current: ${options.length}), generating additional fallback words...`);
      
      // Try multiple times to get more unique fallback words
      let attempts = 0;
      while (options.length < 3 && attempts < 3) {
        const additionalDistractors = generateFallbackDistractors(correctWord);
        options = deduplicateWords([...options, ...additionalDistractors]);
        attempts++;
      }
      
      // Last resort: if still not enough, use very common words
      if (options.length < 3) {
        const lastResortWords = ['und', 'oder', 'aber', 'wenn', 'dann', 'sehr', 'mehr', 'hier', 'dort', 'jetzt'];
        for (const word of lastResortWords) {
          if (options.length >= 3) break;
          options = deduplicateWords([...options, word]);
        }
      }
      
      console.log(`✅ After fallback expansion: ${options.length} unique options`);
    }

    // Take only first 3 unique options
    options = options.slice(0, 3);
    
    // Final validation - ensure we have exactly 3 unique options
    if (options.length < 3) {
      console.error(`❌ Failed to generate 3 unique options for "${correctWord}". Only got: ${options.length}`);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to generate sufficient unique word options',
        options: options
      });
    }

    // Shuffle to randomize position
    const shuffledOptions = shuffleArray(options);

    console.log(`✅ Final suggestions (${method}):`, shuffledOptions);

    return res.status(200).json({
      success: true,
      correctWord,
      options: shuffledOptions,
      method
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to generate suggestions',
      error: error.message 
    });
  }
}
