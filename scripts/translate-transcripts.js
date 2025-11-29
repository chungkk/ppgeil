/**
 * Script to pre-translate transcript JSON files from German to Vietnamese/English
 * Usage: node scripts/translate-transcripts.js [filename] [--lang vi|en]
 * Example: node scripts/translate-transcripts.js dieses-spray-macht-alles-unzerstrbar.json --lang en
 * Or run all: node scripts/translate-transcripts.js --all --lang vi
 * 
 * Options:
 *   --lang vi    Translate to Vietnamese (default, saves to 'translation' field)
 *   --lang en    Translate to English (saves to 'translation_en' field)
 *   --all        Translate all files
 *   --list       List all JSON files
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEXT_DIR = path.join(__dirname, '../public/text');

const LANGUAGE_CONFIG = {
  vi: {
    name: 'Vietnamese',
    field: 'translation',
    prompt: 'You are a professional German to Vietnamese translator. Translate naturally and accurately. Return ONLY the Vietnamese translation, no explanations.'
  },
  en: {
    name: 'English',
    field: 'translation_en',
    prompt: 'You are a professional German to English translator. Translate naturally and accurately. Return ONLY the English translation, no explanations.'
  }
};

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Translate using OpenAI
async function translateWithOpenAI(text, targetLang = 'vi') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured in .env.local');
  }

  const config = LANGUAGE_CONFIG[targetLang] || LANGUAGE_CONFIG.vi;

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
          content: config.prompt,
        },
        {
          role: 'user',
          content: `Translate to ${config.name}: ${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim();
}

// Translate a single JSON file
async function translateFile(filename, targetLang = 'vi') {
  const filePath = path.join(TEXT_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const config = LANGUAGE_CONFIG[targetLang] || LANGUAGE_CONFIG.vi;
  const translationField = config.field;
  
  console.log(`\n📖 Processing: ${filename} (→ ${config.name})`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  // Check how many need translation for this language
  const needsTranslation = data.filter(item => !item[translationField]);
  console.log(`   Total sentences: ${data.length}`);
  console.log(`   Already translated (${config.name}): ${data.length - needsTranslation.length}`);
  console.log(`   Need translation: ${needsTranslation.length}`);
  
  if (needsTranslation.length === 0) {
    console.log(`   ✅ All sentences already translated to ${config.name}!`);
    return;
  }

  let translatedCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    // Skip if already has translation for this language
    if (item[translationField]) {
      continue;
    }
    
    try {
      const translation = await translateWithOpenAI(item.text, targetLang);
      data[i][translationField] = translation;
      translatedCount++;
      
      console.log(`   [${translatedCount}/${needsTranslation.length}] "${item.text.substring(0, 40)}..." → "${translation.substring(0, 40)}..."`);
      
      // Save after each translation (in case of interruption)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
      
      // Rate limiting - delay between requests
      await delay(200);
      
    } catch (error) {
      console.error(`   ❌ Error translating: "${item.text.substring(0, 30)}...": ${error.message}`);
      // Continue with next sentence
    }
  }
  
  console.log(`   ✅ Done! Translated ${translatedCount} sentences to ${config.name}.`);
}

// Parse --lang argument
function getTargetLang(args) {
  const langIndex = args.indexOf('--lang');
  if (langIndex !== -1 && args[langIndex + 1]) {
    const lang = args[langIndex + 1];
    if (LANGUAGE_CONFIG[lang]) {
      return lang;
    }
    console.warn(`⚠️ Unknown language: ${lang}. Using 'vi' as default.`);
  }
  return 'vi';
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const targetLang = getTargetLang(args);
  const config = LANGUAGE_CONFIG[targetLang];
  
  // Filter out --lang and its value from args
  const filteredArgs = args.filter((arg, i) => arg !== '--lang' && args[i - 1] !== '--lang');
  
  if (filteredArgs.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/translate-transcripts.js <filename.json> [--lang vi|en]  - Translate single file');
    console.log('  node scripts/translate-transcripts.js --all [--lang vi|en]            - Translate all files');
    console.log('  node scripts/translate-transcripts.js --list                          - List all JSON files');
    console.log('');
    console.log('Languages:');
    console.log('  --lang vi   Vietnamese (default, saves to "translation" field)');
    console.log('  --lang en   English (saves to "translation_en" field)');
    return;
  }

  if (filteredArgs[0] === '--list') {
    const files = fs.readdirSync(TEXT_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} JSON files:`);
    files.forEach(f => console.log(`  - ${f}`));
    return;
  }

  console.log(`🌐 Target language: ${config.name} (field: ${config.field})\n`);

  if (filteredArgs[0] === '--all') {
    const files = fs.readdirSync(TEXT_DIR).filter(f => f.endsWith('.json'));
    console.log(`🚀 Translating all ${files.length} files to ${config.name}...\n`);
    
    for (const file of files) {
      await translateFile(file, targetLang);
    }
    
    console.log(`\n🎉 All files processed! (${config.name})`);
    return;
  }

  // Single file
  await translateFile(filteredArgs[0], targetLang);
}

main().catch(console.error);
