// API to translate vocabulary to user's language
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Simple in-memory cache
const translationCache = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vocabulary, targetLang = 'en' } = req.body;

    if (!vocabulary || !Array.isArray(vocabulary)) {
      return res.status(400).json({ message: 'Vocabulary array is required' });
    }

    // If target is Vietnamese, return as-is (already in Vietnamese)
    if (targetLang === 'vi') {
      return res.status(200).json({ success: true, vocabulary });
    }

    if (!OPENAI_API_KEY) {
      // Return original if no API key
      return res.status(200).json({ success: true, vocabulary });
    }

    // Check cache first
    const cacheKey = `${targetLang}_${vocabulary.map(v => v.word).join('_')}`;
    if (translationCache.has(cacheKey)) {
      return res.status(200).json({ 
        success: true, 
        vocabulary: translationCache.get(cacheKey),
        cached: true 
      });
    }

    // Prepare words for translation
    const wordsToTranslate = vocabulary.map(v => ({
      word: v.word,
      translation: v.translation
    }));

    const languageNames = {
      en: 'English',
      de: 'German'
    };

    const targetLanguage = languageNames[targetLang] || 'English';

    const prompt = `Translate these German vocabulary translations from Vietnamese to ${targetLanguage}.
Return ONLY a JSON array with the translated meanings, in the same order:

Input:
${JSON.stringify(wordsToTranslate, null, 2)}

Return format (ONLY JSON, no markdown):
["translation1", "translation2", ...]`;

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
            content: 'You are a translator. Return only valid JSON array of translations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      // Return original on error
      return res.status(200).json({ success: true, vocabulary });
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content?.trim();
    
    // Parse translations
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const translations = JSON.parse(content);

    // Map back to vocabulary
    const translatedVocab = vocabulary.map((v, i) => ({
      ...v,
      translation: translations[i] || v.translation
    }));

    // Cache result
    translationCache.set(cacheKey, translatedVocab);

    return res.status(200).json({
      success: true,
      vocabulary: translatedVocab
    });

  } catch (error) {
    console.error('Translate vocab error:', error);
    // Return original vocabulary on error
    return res.status(200).json({ 
      success: true, 
      vocabulary: req.body.vocabulary 
    });
  }
}
