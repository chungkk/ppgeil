#!/usr/bin/env node

/**
 * Script để extract từ vựng cho tất cả bài học
 * 
 * Usage:
 *   node scripts/extractAllVocabulary.js                    # Extract tất cả bài chưa có vocab
 *   node scripts/extractAllVocabulary.js --force            # Extract lại tất cả (ghi đè)
 *   node scripts/extractAllVocabulary.js --lesson=lesson-id # Extract 1 bài cụ thể
 */

const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const LANGUAGE_NAMES = {
  vi: 'tiếng Việt',
  en: 'English',
  de: 'Deutsch'
};

// Parse command line arguments
const args = process.argv.slice(2);
const forceMode = args.includes('--force');
const singleLesson = args.find(a => a.startsWith('--lesson='))?.split('=')[1];

async function extractVocabularyWithAI(fullText, level, targetLang = 'vi') {
  const apiKey = OPENAI_API_KEY || GROQ_API_KEY;
  const isOpenAI = !!OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('No AI API key available. Set OPENAI_API_KEY or GROQ_API_KEY in .env.local');
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang;

  const prompt = `Du bist ein Experte für Deutsch als Fremdsprache. Analysiere den folgenden deutschen Text und extrahiere die wichtigsten Vokabeln für Deutschlerner auf dem Niveau ${level}.

TEXT:
"""
${fullText.substring(0, 8000)}
"""

Extrahiere 15-30 wichtige Wörter/Ausdrücke und gib ein JSON-Array zurück (KEIN Markdown, nur reines JSON):

[
  {
    "word": "das genaue Wort wie im Text",
    "baseForm": "Grundform (Infinitiv für Verben, Singular für Nomen mit Artikel)",
    "translation": "Übersetzung auf ${targetLanguageName}",
    "partOfSpeech": "Nomen/Verb/Adjektiv/Adverb/Präposition/Konjunktion/Phrase",
    "level": "A1/A2/B1/B2/C1",
    "note": "kurze Erklärung oder Verwendungshinweis auf ${targetLanguageName} (optional)"
  }
]

Anforderungen:
- Wähle Wörter, die für ${level}-Lerner nützlich und wichtig sind
- Inkludiere sowohl einfache als auch herausfordernde Wörter
- Bei Nomen immer mit Artikel (der/die/das)
- Bei Verben die Infinitivform als baseForm
- Bei trennbaren Verben: baseForm = Infinitiv (z.B. "ankommen")
- Phrasen und Redewendungen sind auch willkommen
- Sortiere nach Wichtigkeit/Häufigkeit im Text`;

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
          content: `Du bist ein deutscher Linguistikexperte mit 20 Jahren Erfahrung im DaF-Unterricht. Du gibst immer reines JSON zurück, ohne Markdown-Formatierung.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let content = data.choices[0]?.message?.content?.trim();
  
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  return JSON.parse(content);
}

function findSentenceIndices(vocabulary, transcriptData) {
  return vocabulary.map(vocab => {
    const word = vocab.word.toLowerCase();
    const baseForm = vocab.baseForm?.toLowerCase() || word;
    
    const sentences = [];
    transcriptData.forEach((sentence, index) => {
      const text = sentence.text.toLowerCase();
      if (text.includes(word) || text.includes(baseForm)) {
        sentences.push(index);
      }
    });
    
    return {
      ...vocab,
      sentences: sentences.slice(0, 5)
    };
  });
}

function detectLevelFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('-a1-') || lower.includes('-a1.')) return 'A1';
  if (lower.includes('-a2-') || lower.includes('-a2.')) return 'A2';
  if (lower.includes('-b1-') || lower.includes('-b1.')) return 'B1';
  if (lower.includes('-b2-') || lower.includes('-b2.')) return 'B2';
  if (lower.includes('-c1-') || lower.includes('-c1.')) return 'C1';
  if (lower.includes('-c2-') || lower.includes('-c2.')) return 'C2';
  return 'B1'; // default
}

async function processLesson(lessonId, textDir) {
  const jsonPath = path.join(textDir, `${lessonId}.json`);
  const vocabPath = path.join(textDir, `${lessonId}.vocab.json`);

  // Check if vocab already exists
  if (!forceMode) {
    try {
      await fs.access(vocabPath);
      console.log(`⏭️  Skip: ${lessonId} (vocab exists)`);
      return { status: 'skipped', lessonId };
    } catch {
      // File doesn't exist, continue
    }
  }

  // Load transcript
  let transcriptData;
  try {
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    transcriptData = JSON.parse(jsonContent);
  } catch (err) {
    console.log(`❌ Error loading: ${lessonId} - ${err.message}`);
    return { status: 'error', lessonId, error: err.message };
  }

  if (!Array.isArray(transcriptData) || transcriptData.length === 0) {
    console.log(`❌ Invalid transcript: ${lessonId}`);
    return { status: 'error', lessonId, error: 'Invalid transcript' };
  }

  const level = detectLevelFromFilename(lessonId);
  const fullText = transcriptData.map(s => s.text).join('\n');

  console.log(`🔍 Extracting: ${lessonId} (${level})...`);

  try {
    const rawVocabulary = await extractVocabularyWithAI(fullText, level, 'vi');
    const vocabulary = findSentenceIndices(rawVocabulary, transcriptData);

    const vocabData = {
      lessonId: lessonId,
      level: level,
      targetLang: 'vi',
      extractedAt: new Date().toISOString(),
      totalWords: vocabulary.length,
      vocabulary: vocabulary
    };

    await fs.writeFile(vocabPath, JSON.stringify(vocabData, null, 2), 'utf-8');
    console.log(`✅ Saved: ${lessonId}.vocab.json (${vocabulary.length} words)`);

    return { status: 'success', lessonId, wordCount: vocabulary.length };
  } catch (err) {
    console.log(`❌ AI Error: ${lessonId} - ${err.message}`);
    return { status: 'error', lessonId, error: err.message };
  }
}

async function main() {
  console.log('🚀 Extract Vocabulary Script\n');

  if (!OPENAI_API_KEY && !GROQ_API_KEY) {
    console.error('❌ Error: No API key found. Set OPENAI_API_KEY or GROQ_API_KEY in .env.local');
    process.exit(1);
  }

  const textDir = path.join(__dirname, '..', 'public', 'text');

  if (singleLesson) {
    // Process single lesson
    const result = await processLesson(singleLesson, textDir);
    console.log('\n📊 Result:', result);
    return;
  }

  // Get all JSON files (excluding .vocab.json)
  const files = await fs.readdir(textDir);
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.vocab.json'));

  console.log(`📁 Found ${jsonFiles.length} lessons\n`);

  const results = { success: 0, skipped: 0, error: 0 };
  const errors = [];

  for (const file of jsonFiles) {
    const lessonId = file.replace('.json', '');
    const result = await processLesson(lessonId, textDir);
    
    results[result.status]++;
    if (result.status === 'error') {
      errors.push(result);
    }

    // Rate limiting - wait 1s between API calls
    if (result.status === 'success') {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Success: ${results.success}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);
  console.log(`   ❌ Errors: ${results.error}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   - ${e.lessonId}: ${e.error}`));
  }
}

main().catch(console.error);
