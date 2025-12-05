// Multi-Provider Translation API with intelligent fallback chain
// Priority: DeepL (best for German) → Google Translate → OpenAI → Groq → MyMemory
// 
// Setup API Keys in .env.local:
// DEEPL_API_KEY=your_key           (Free: 500k chars/month - https://www.deepl.com/pro-api)
// GOOGLE_TRANSLATE_API_KEY=your_key (Free: $300 credit - https://cloud.google.com/translate)
// OPENAI_API_KEY=your_key          (Paid - https://platform.openai.com/)
// GROQ_API_KEY=your_key            (Free - https://console.groq.com/keys)

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const LANGUAGE_NAMES = {
  vi: 'Tiếng Việt',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese'
};

/**
 * Translate using DeepL (BEST for German, especially DE→VI)
 * Free tier: 500,000 characters/month
 */
async function translateWithDeepL(text, sourceLang, targetLang) {
  if (!DEEPL_API_KEY) {
    throw new Error('DEEPL_API_KEY not configured');
  }

  // DeepL uses 'EN' for English, 'DE' for German
  const sourceCode = sourceLang.toUpperCase();
  // DeepL doesn't have Vietnamese, so this will fail gracefully
  // But we keep the structure for when they add it
  const targetCode = targetLang === 'vi' ? 'EN' : targetLang.toUpperCase();

  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: sourceCode,
      target_lang: targetCode,
    }),
  });

  if (!response.ok) {
    throw new Error('DeepL API request failed');
  }

  const data = await response.json();
  return data.translations[0]?.text || null;
}

/**
 * Translate using Google Cloud Translation API
 * Best balance of quality and price
 */
async function translateWithGoogle(text, sourceLang, targetLang) {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY not configured');
  }

  // Prepare request body - omit source for auto-detection
  const requestBody = {
    q: text,
    target: targetLang,
    format: 'text',
  };

  // Only include source if it's not 'auto' (Google will auto-detect if omitted)
  if (sourceLang && sourceLang !== 'auto') {
    requestBody.source = sourceLang;
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error('Google Translate API request failed');
  }

  const data = await response.json();
  return data.data?.translations?.[0]?.translatedText || null;
}

/**
 * Translate using OpenAI GPT-4 (high quality but expensive)
 * @param {string} text - Text to translate
 * @param {string} context - Context sentence (for word translation)
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code
 * @param {string} sentenceTranslation - Existing sentence translation (for smart extraction)
 * @param {string} mode - 'word' or 'sentence'
 */
async function translateWithOpenAI(text, context = '', targetLang = 'vi', sourceLang = 'de', sentenceTranslation = '', mode = 'word') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang] || 'the target language';
  const sourceLanguageName = LANGUAGE_NAMES[sourceLang] || sourceLang;

  let prompt;
  let systemPrompt;
  let maxTokens = 60;
  
  // SENTENCE MODE: Natural, fluent translation for full sentences
  if (mode === 'sentence') {
    systemPrompt = `Bạn là một dịch giả chuyên nghiệp với 20 năm kinh nghiệm dịch ${sourceLanguageName} sang ${targetLanguageName}. 
Phong cách dịch của bạn:
- Dịch tự nhiên, trôi chảy như người bản ngữ nói
- Giữ nguyên ý nghĩa và cảm xúc của câu gốc
- Không dịch máy móc từng từ
- Sử dụng cách diễn đạt phổ biến trong ${targetLanguageName}
- Với tiếng Việt: dùng từ ngữ đời thường, dễ hiểu, tránh từ Hán Việt khó hiểu`;
    
    prompt = `Dịch câu sau sang ${targetLanguageName} một cách tự nhiên và trôi chảy:

"${text}"

CHỈ trả về bản dịch, KHÔNG giải thích.`;
    
    maxTokens = 200;
  } 
  // WORD MODE: Extract meaning from context
  else {
    systemPrompt = `You are a professional translation expert. Provide accurate and natural translations to ${targetLanguageName}.`;
    
    // Handle auto-detection
    const sourceText = (sourceLang === 'auto' || !sourceLang)
      ? 'automatically detect the source language and translate'
      : `Translate from ${sourceLanguageName}`;

    // If we have both context and its translation, use smart extraction
    if (context && sentenceTranslation) {
      prompt = `Extract the meaning of "${text}" from this sentence pair:

Original: "${context}"
Translation: "${sentenceTranslation}"

What does "${text}" mean in ${targetLanguageName}? Return ONLY the meaning, no explanations.`;
    } else if (context) {
      prompt = `${sourceText} to ${targetLanguageName}. This word appears in context: "${context}"

Word: ${text}

Return 2-3 common meanings in ${targetLanguageName}, separated by commas. Example: "house, home, building". No explanations.`;
    } else {
      prompt = `${sourceText} to ${targetLanguageName}: ${text}

Return 2-3 common meanings in ${targetLanguageName}, separated by commas. Example: "house, home, building". No explanations.`;
    }
  }

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
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: mode === 'sentence' ? 0.5 : 0.3, // Higher temp for more natural sentence translation
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim();
}

/**
 * Translate using Groq AI (improved prompt for better translation with auto-detection)
 */
async function translateWithGroq(text, context = '', targetLang = 'vi', sourceLang = 'de', sentenceTranslation = '') {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang] || 'the target language';

  // Handle auto-detection
  const sourceText = (sourceLang === 'auto' || !sourceLang)
    ? 'Automatically detect the source language and translate'
    : `Translate from ${LANGUAGE_NAMES[sourceLang] || sourceLang}`;

  let prompt;
  
  // If we have both context and its translation, use smart extraction
  if (context && sentenceTranslation) {
    prompt = `Extract the meaning of "${text}" from this sentence pair:

Original: "${context}"
Translation: "${sentenceTranslation}"

What does "${text}" mean in ${targetLanguageName}? Return ONLY the meaning, no explanations, no articles.`;
  } else if (context) {
    prompt = `${sourceText} to ${targetLanguageName}. This word appears in context: "${context}"

Word to translate: ${text}

ONLY return the meaning in ${targetLanguageName}, NO explanations, NO additional text. If it's a noun, DO NOT add articles (der/die/das). Translation must be concise, natural and accurate.`;
  } else {
    prompt = `${sourceText} to ${targetLanguageName}: ${text}

ONLY return the meaning in ${targetLanguageName}, NO explanations, NO additional text. If it's a noun, DO NOT add articles (der/die/das). Translation must be concise, natural and accurate.`;
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // More powerful model for better translation
      messages: [
        {
          role: 'system',
          content: `You are an expert multilingual translator with 20 years of experience. You always provide accurate, natural translations to ${targetLanguageName} that fit the context. ONLY return the ${targetLanguageName} translation, NO explanations or additional text.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2, // Lower for more consistent translations
      max_tokens: 60,
    }),
  });

  if (!response.ok) {
    throw new Error('Groq API request failed');
  }

  const data = await response.json();
  const translation = data.choices[0]?.message?.content?.trim();

  return translation;
}

/**
 * Translate using MyMemory (fallback)
 */
async function translateWithMyMemory(text, sourceLang, targetLang) {
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error('MyMemory API request failed');
  }

  const data = await response.json();

  if (data.responseStatus === 200 && data.responseData) {
    return data.responseData.translatedText;
  }
  
  return null;
}

/**
 * Helper to add timeout to promises
 */
function withTimeout(promise, timeoutMs, serviceName) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${serviceName} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Translate a full sentence using OpenAI only (for natural, high-quality translation)
 */
async function translateSentenceWithOpenAI(text, sourceLang, targetLang) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  try {
    const result = await withTimeout(
      translateWithOpenAI(text, '', targetLang, sourceLang, '', 'sentence'),
      8000, // 8s timeout for sentence (longer text)
      'OpenAI-Sentence'
    );
    return { method: 'openai-sentence', translation: result };
  } catch (error) {
    console.error('OpenAI sentence translation failed:', error.message);
    return null;
  }
}

/**
 * Try all services in parallel and return the fastest successful result
 * @param {string} mode - 'word' (default) or 'sentence'
 */
async function translateParallel(text, context, sourceLang, targetLang, sentenceTranslation = '', mode = 'word') {
  // SENTENCE MODE: Use OpenAI only for natural translation
  if (mode === 'sentence') {
    const result = await translateSentenceWithOpenAI(text, sourceLang, targetLang);
    if (result && result.translation) {
      return result;
    }
    // Fallback to Google if OpenAI fails
    if (GOOGLE_TRANSLATE_API_KEY) {
      try {
        const googleResult = await withTimeout(translateWithGoogle(text, sourceLang, targetLang), 5000, 'Google');
        if (googleResult) {
          return { method: 'google-translate-fallback', translation: googleResult };
        }
      } catch (e) {
        console.error('Google fallback failed:', e.message);
      }
    }
    return null;
  }
  
  // WORD MODE: Use parallel translation with all services
  const promises = [];

  // OpenAI with 4s timeout
  if (OPENAI_API_KEY) {
    promises.push(
      withTimeout(translateWithOpenAI(text, context, targetLang, sourceLang, sentenceTranslation, 'word'), 4000, 'OpenAI')
        .then(result => ({ method: 'openai-gpt4', translation: result, priority: 1 }))
        .catch(error => ({ error: error.message, method: 'openai-gpt4', priority: 1 }))
    );
  }

  // Google Translate with 3s timeout (doesn't use sentenceTranslation)
  if (GOOGLE_TRANSLATE_API_KEY) {
    promises.push(
      withTimeout(translateWithGoogle(text, sourceLang, targetLang), 3000, 'Google')
        .then(result => ({ method: 'google-translate', translation: result, priority: 2 }))
        .catch(error => ({ error: error.message, method: 'google-translate', priority: 2 }))
    );
  }

  // Groq with 4s timeout
  if (GROQ_API_KEY) {
    promises.push(
      withTimeout(translateWithGroq(text, context, targetLang, sourceLang, sentenceTranslation), 4000, 'Groq')
        .then(result => ({ method: 'groq-llama', translation: result, priority: 3 }))
        .catch(error => ({ error: error.message, method: 'groq-llama', priority: 3 }))
    );
  }

  // MyMemory with 3s timeout (always available)
  promises.push(
    withTimeout(translateWithMyMemory(text, sourceLang, targetLang), 3000, 'MyMemory')
      .then(result => ({ method: 'mymemory', translation: result, priority: 4 }))
      .catch(error => ({ error: error.message, method: 'mymemory', priority: 4 }))
  );

  if (promises.length === 0) {
    return null;
  }
  
  // Wait for all promises to complete
  const results = await Promise.all(promises);
  
  // Filter successful results
  const successResults = results.filter(r => r.translation && !r.error && r.translation !== text);
  
  if (successResults.length === 0) {
    console.log('All services failed:', results.map(r => `${r.method}: ${r.error || 'no result'}`).join(', '));
    return null;
  }
  
  // Sort by priority and return the best one
  successResults.sort((a, b) => a.priority - b.priority);
  return successResults[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text, context = '', sourceLang = 'de', targetLang = 'vi', sentenceTranslation = '', mode = 'word' } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    // For sentence mode, preserve original case; for word mode, lowercase
    const cleanText = mode === 'sentence' ? text.trim() : text.trim().toLowerCase();
    
    // Try translation with specified mode
    const result = await translateParallel(cleanText, context, sourceLang, targetLang, sentenceTranslation, mode);
    
    if (result) {
      console.log(`✅ ${result.method}: ${cleanText} → ${result.translation}`);
      return res.status(200).json({
        success: true,
        originalText: cleanText,
        translation: result.translation,
        method: result.method,
        sourceLang,
        targetLang
      });
    }
    
    // No translation found
    console.error(`❌ All translation services failed for: ${cleanText}`);
    return res.status(200).json({
      success: true,
      originalText: cleanText,
      translation: cleanText,
      method: 'none',
      sourceLang,
      targetLang,
      warning: 'No translation service available'
    });

  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Translation failed',
      error: error.message 
    });
  }
}
