/**
 * Script to pre-translate transcript JSON files from German to Vietnamese
 * Usage: node scripts/translate-transcripts.js [filename]
 * Example: node scripts/translate-transcripts.js dieses-spray-macht-alles-unzerstrbar.json
 * Or run all: node scripts/translate-transcripts.js --all
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEXT_DIR = path.join(__dirname, '../public/text');

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Translate using OpenAI
async function translateWithOpenAI(text) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured in .env.local');
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
          content: 'You are a professional German to Vietnamese translator. Translate naturally and accurately. Return ONLY the Vietnamese translation, no explanations.',
        },
        {
          role: 'user',
          content: `Translate to Vietnamese: ${text}`,
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
async function translateFile(filename) {
  const filePath = path.join(TEXT_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  console.log(`\n📖 Processing: ${filename}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  // Check how many need translation
  const needsTranslation = data.filter(item => !item.translation);
  console.log(`   Total sentences: ${data.length}`);
  console.log(`   Already translated: ${data.length - needsTranslation.length}`);
  console.log(`   Need translation: ${needsTranslation.length}`);
  
  if (needsTranslation.length === 0) {
    console.log('   ✅ All sentences already translated!');
    return;
  }

  let translatedCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    // Skip if already has translation
    if (item.translation) {
      continue;
    }
    
    try {
      const translation = await translateWithOpenAI(item.text);
      data[i].translation = translation;
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
  
  console.log(`   ✅ Done! Translated ${translatedCount} sentences.`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/translate-transcripts.js <filename.json>  - Translate single file');
    console.log('  node scripts/translate-transcripts.js --all            - Translate all files');
    console.log('  node scripts/translate-transcripts.js --list           - List all JSON files');
    return;
  }

  if (args[0] === '--list') {
    const files = fs.readdirSync(TEXT_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} JSON files:`);
    files.forEach(f => console.log(`  - ${f}`));
    return;
  }

  if (args[0] === '--all') {
    const files = fs.readdirSync(TEXT_DIR).filter(f => f.endsWith('.json'));
    console.log(`🚀 Translating all ${files.length} files...\n`);
    
    for (const file of files) {
      await translateFile(file);
    }
    
    console.log('\n🎉 All files processed!');
    return;
  }

  // Single file
  await translateFile(args[0]);
}

main().catch(console.error);
