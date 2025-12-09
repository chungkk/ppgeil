// Script to download all Nomen-Verb-Verbindung explanations and save to JSON
// Run: node scripts/downloadPhraseExplanations.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

// Import the phrases data
const nomenVerbVerbindungen = require('../lib/data/nomenVerbVerbindungen').default;

const languageConfig = {
  vi: {
    name: 'Tiếng Việt',
    getPrompt: (phrase, meaning, example) => `Bạn là một giáo viên tiếng Đức giàu kinh nghiệm. Hãy giải thích chi tiết cụm Nomen-Verb-Verbindung sau cho người học tiếng Việt:

Cụm từ: "${phrase}"
Nghĩa tương đương: ${meaning}
Ví dụ: "${example}"

Hãy giải thích theo format sau (viết ngắn gọn, dễ hiểu):

**Nghĩa:** [dịch nghĩa chính xác sang tiếng Việt]

**Cách dùng:** [giải thích ngắn gọn khi nào dùng cụm này, ngữ cảnh phù hợp]

**Cấu trúc:** [giải thích cấu trúc ngữ pháp, ví dụ: "jd/etw + Akk"]

**Ví dụ thêm:**
1. [1 ví dụ tiếng Đức] → [dịch tiếng Việt]
2. [1 ví dụ tiếng Đức] → [dịch tiếng Việt]

**Mẹo nhớ:** [1 cách nhớ dễ dàng]`
  },
  en: {
    name: 'English',
    getPrompt: (phrase, meaning, example) => `You are an experienced German teacher. Explain the following Nomen-Verb-Verbindung in detail for English speakers:

Phrase: "${phrase}"
Equivalent meaning: ${meaning}
Example: "${example}"

Explain using this format (keep it concise and clear):

**Meaning:** [accurate English translation]

**Usage:** [briefly explain when to use this phrase, appropriate context]

**Structure:** [explain grammatical structure, e.g., "jd/etw + Akk"]

**More examples:**
1. [German example] → [English translation]
2. [German example] → [English translation]

**Memory tip:** [one easy way to remember]`
  }
};

async function fetchExplanation(phrase, meaning, example, lang) {
  const config = languageConfig[lang];
  
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
          content: `You are an expert German language teacher specializing in Nomen-Verb-Verbindungen. Provide clear, practical explanations in ${config.name}.`,
        },
        {
          role: 'user',
          content: config.getPrompt(phrase, meaning, example),
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const outputPath = path.join(__dirname, '..', 'lib', 'data', 'phraseExplanations.json');
  
  // Load existing data if available
  let existingData = {};
  if (fs.existsSync(outputPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      console.log(`Loaded existing data with ${Object.keys(existingData).length} phrases`);
    } catch (e) {
      console.log('Starting fresh...');
    }
  }

  const totalPhrases = nomenVerbVerbindungen.length;
  console.log(`Total phrases to process: ${totalPhrases}`);
  
  let processed = 0;
  let skipped = 0;

  for (const item of nomenVerbVerbindungen) {
    const key = item.phrase;
    
    // Skip if already have both vi and en explanations
    if (existingData[key]?.vi && existingData[key]?.en) {
      skipped++;
      continue;
    }

    if (!existingData[key]) {
      existingData[key] = {};
    }

    try {
      // Fetch Vietnamese explanation if missing
      if (!existingData[key].vi) {
        console.log(`[${processed + skipped + 1}/${totalPhrases}] Fetching VI: ${key}`);
        existingData[key].vi = await fetchExplanation(item.phrase, item.meaning, item.example, 'vi');
        await sleep(200); // Rate limiting
      }

      // Fetch English explanation if missing
      if (!existingData[key].en) {
        console.log(`[${processed + skipped + 1}/${totalPhrases}] Fetching EN: ${key}`);
        existingData[key].en = await fetchExplanation(item.phrase, item.meaning, item.example, 'en');
        await sleep(200); // Rate limiting
      }

      processed++;

      // Save every 10 phrases
      if (processed % 10 === 0) {
        fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log(`Saved progress: ${processed} new phrases processed`);
      }

    } catch (error) {
      console.error(`Error processing "${key}":`, error.message);
      // Save current progress before potential exit
      fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2), 'utf-8');
      await sleep(2000); // Wait longer on error
    }
  }

  // Final save
  fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2), 'utf-8');
  console.log(`\nDone! Processed ${processed} new phrases, skipped ${skipped} existing.`);
  console.log(`Output saved to: ${outputPath}`);
}

main().catch(console.error);
