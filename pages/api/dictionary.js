import connectDB from '../../lib/mongodb';
import mongoose from 'mongoose';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const DEFAULT_CACHE_VERSION = 'v1'; // Default version
const DEFAULT_CACHE_EXPIRY_DAYS = 7; // Default expiry days

// Define Mongoose schema for dictionary cache
const DictionaryCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  word: { type: String, required: true },
  targetLang: { type: String, required: true },
  version: { type: String, required: true, default: 'v1' },
  data: { type: Object, required: true },
  hits: { type: Number, default: 0 }, // Track cache hits for analytics
  createdAt: { type: Date, default: Date.now, index: true }
});

// Get or create the model
const DictionaryCache = mongoose.models.DictionaryCache ||
  mongoose.model('DictionaryCache', DictionaryCacheSchema);

// Cache Settings Schema
const CacheSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const CacheSettings = mongoose.models.CacheSettings ||
  mongoose.model('CacheSettings', CacheSettingsSchema);

// Get cache settings from database
async function getCacheSettings() {
  try {
    await connectDB();
    const expiryDaysSetting = await CacheSettings.findOne({ key: 'CACHE_EXPIRY_DAYS' });
    const versionSetting = await CacheSettings.findOne({ key: 'CACHE_VERSION' });

    return {
      expiryDays: expiryDaysSetting?.value || DEFAULT_CACHE_EXPIRY_DAYS,
      version: versionSetting?.value || DEFAULT_CACHE_VERSION
    };
  } catch (error) {
    console.error('Error fetching cache settings:', error);
    return {
      expiryDays: DEFAULT_CACHE_EXPIRY_DAYS,
      version: DEFAULT_CACHE_VERSION
    };
  }
}

const LANGUAGE_NAMES = {
  vi: 'tiếng Việt',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  zh: '中文'
};

async function getDictionaryDataWithAI(word, translation, targetLang = 'vi') {
  const apiKey = OPENAI_API_KEY || GROQ_API_KEY;
  const isOpenAI = !!OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('No AI API key available');
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang;

  const prompt = `Du bist ein Experte für deutsche Linguistik. Analysiere das deutsche Wort "${word}" und gib ein JSON zurück (KEIN Markdown, nur reines JSON):

{
  "partOfSpeech": "Wortart auf Deutsch (Nomen/Verb/Adjektiv/Adverb/Präposition...)",
  "wordType": "Detaillierte Erklärung der Wortart auf ${targetLanguageName}",
  "explanation": "Detaillierte grammatikalische Erklärung auf ${targetLanguageName}: Rolle, Verwendung, Kontext. Maximal 2-3 Sätze.",
  "examples": [
    {
      "de": "Natürlicher deutscher Beispielsatz mit dem Wort '${word}'",
      "translation": "Übersetzung des Beispiels auf ${targetLanguageName}"
    },
    {
      "de": "Zweiter Beispielsatz mit anderem Kontext",
      "translation": "Übersetzung auf ${targetLanguageName}"
    }
  ]
}

Anforderungen:
- Erklärung muss präzise, kurz und verständlich sein (auf ${targetLanguageName})
- Beispiele müssen natürlich und realistisch sein, nicht zu lang (10-15 Wörter)
- Bei Nomen das Genus (der/die/das) erwähnen
- Fokus auf praktische Verwendung in der Kommunikation`;

  const apiUrl = isOpenAI 
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';

  const model = isOpenAI ? 'gpt-4o-mini' : 'llama-3.3-70b-versatile';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: `Du bist ein deutscher Linguistikexperte mit 20 Jahren Erfahrung im Deutschunterricht. Du gibst immer reines JSON zurück, ohne Markdown. Alle Erklärungen und Übersetzungen müssen in ${LANGUAGE_NAMES[targetLang] || targetLang} sein.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  let content = data.choices[0]?.message?.content?.trim();
  
  // Remove markdown code blocks if present
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  return JSON.parse(content);
}

// Get cached dictionary data from MongoDB using Mongoose
async function getCachedDictionary(word, targetLang) {
  try {
    await connectDB();
    const settings = await getCacheSettings();

    const cacheKey = `${word}_${targetLang}_${settings.version}`.toLowerCase();
    const cached = await DictionaryCache.findOne({ cacheKey, version: settings.version });

    if (cached) {
      const expiryDate = new Date(cached.createdAt);
      expiryDate.setDate(expiryDate.getDate() + settings.expiryDays);

      if (new Date() < expiryDate) {
        // Increment hit counter for analytics
        await DictionaryCache.updateOne(
          { cacheKey },
          { $inc: { hits: 1 } }
        );

        console.log(`✅ Cache hit for "${word}" (hits: ${cached.hits + 1})`);
        return cached.data;
      }
      // Cache expired, delete it
      await DictionaryCache.deleteOne({ cacheKey });
    }

    console.log(`❌ Cache miss for "${word}"`);
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

// Save dictionary data to MongoDB cache using Mongoose
async function saveToCacheDictionary(word, data, targetLang) {
  try {
    await connectDB();
    const settings = await getCacheSettings();

    const cacheKey = `${word}_${targetLang}_${settings.version}`.toLowerCase();

    await DictionaryCache.updateOne(
      { cacheKey },
      {
        cacheKey,
        word,
        targetLang,
        version: settings.version,
        data,
        hits: 0,
        createdAt: new Date()
      },
      { upsert: true }
    );

    console.log(`💾 Cached "${word}" (version: ${settings.version})`);
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

// Clean up old cache entries (older than CACHE_EXPIRY_DAYS or old versions)
async function cleanupOldCache() {
  try {
    await connectDB();
    const settings = await getCacheSettings();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.expiryDays);

    // Delete entries that are either old OR from previous versions
    const result = await DictionaryCache.deleteMany({
      $or: [
        { createdAt: { $lt: cutoffDate } },
        { version: { $ne: settings.version } }
      ]
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} old cache entries`);
    }
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { word, sourceLang, targetLang } = req.body;

  if (!word) {
    return res.status(400).json({ success: false, message: 'Word is required' });
  }

  // Cleanup old cache occasionally (10% chance per request)
  if (Math.random() < 0.1) {
    cleanupOldCache().catch(err => console.error('Background cleanup failed:', err));
  }

  try {
    // Check cache first
    const cachedData = await getCachedDictionary(word, targetLang || 'vi');
    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: cachedData,
        fromCache: true
      });
    }

    // Step 1: Get translation
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const response = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: word,
        context: '',
        sourceLang: sourceLang || 'de',
        targetLang: targetLang || 'vi'
      })
    });

    const translateData = await response.json();
    const translation = translateData.translation || word;

    // Step 2: Get AI-generated dictionary data
    let aiData;
    try {
      aiData = await getDictionaryDataWithAI(word, translation, targetLang || 'vi');
    } catch (aiError) {
      console.error('AI generation failed, using fallback:', aiError);
      // Fallback to basic data
      const langName = LANGUAGE_NAMES[targetLang || 'vi'];
      aiData = {
        partOfSpeech: '(Wort)',
        wordType: `Deutsches Wort`,
        explanation: `Das Wort "${word}" bedeutet "${translation}" auf ${langName}.`,
        examples: [
          {
            de: `Das ist ein Beispiel mit ${word}.`,
            translation: translation
          }
        ]
      };
    }

    const dictionaryData = {
      word: word,
      translation: translation,
      explanation: aiData.explanation,
      examples: aiData.examples,
      partOfSpeech: aiData.partOfSpeech,
      wordType: aiData.wordType
    };

    // Save to cache for future requests
    await saveToCacheDictionary(word, dictionaryData, targetLang || 'vi');

    return res.status(200).json({
      success: true,
      data: dictionaryData,
      fromCache: false
    });

  } catch (error) {
    console.error('Dictionary API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dictionary data',
      error: error.message
    });
  }
}
