/**
 * Script to translate Leben in Deutschland questions to Vietnamese using OpenAI API
 * 
 * Usage: node scripts/translateLidToVietnamese.js
 * 
 * This will translate questions in batches and save progress to avoid re-translating
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BATCH_SIZE = 10; // Translate 10 questions at a time
const DELAY_MS = 1000; // Delay between API calls

if (!OPENAI_API_KEY) {
  console.error('Please set OPENAI_API_KEY environment variable');
  console.error('Example: OPENAI_API_KEY=sk-xxx node scripts/translateLidToVietnamese.js');
  process.exit(1);
}

const dataPath = path.join(__dirname, '../lib/data/lebenInDeutschland.js');
const progressPath = path.join(__dirname, '../lib/data/lid_translation_progress.json');

async function translateWithGPT(questions) {
  const prompt = `Translate the following German citizenship test questions to Vietnamese. 
Keep the translation natural and easy to understand for Vietnamese learners.
Return a JSON array with the same structure.

Questions:
${JSON.stringify(questions, null, 2)}

Return format (JSON array):
[
  {
    "id": <question id>,
    "q": "<Vietnamese translation of question>",
    "o": ["<option A in Vietnamese>", "<option B>", "<option C>", "<option D>"]
  },
  ...
]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional translator specializing in German to Vietnamese translation for educational content. Translate accurately but naturally.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Extract JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function loadProgress() {
  try {
    if (fs.existsSync(progressPath)) {
      return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
    }
  } catch (e) {}
  return { translated: {}, lastIndex: 0 };
}

async function saveProgress(progress) {
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Loading data...');
  
  // Dynamic import for ES module
  const dataModule = await import(dataPath);
  const { generalQuestions, stateQuestions } = dataModule;
  
  const progress = await loadProgress();
  console.log(`Progress: ${Object.keys(progress.translated).length} questions translated`);
  
  // Combine all questions
  const allQuestions = [
    ...generalQuestions.map(q => ({ ...q, type: 'general' })),
    ...Object.entries(stateQuestions).flatMap(([state, qs]) => 
      qs.map(q => ({ ...q, type: 'state', state }))
    )
  ];
  
  console.log(`Total questions: ${allQuestions.length}`);
  
  // Filter questions that need translation
  const needTranslation = allQuestions.filter(q => {
    const key = `${q.type}-${q.type === 'state' ? q.state + '-' : ''}${q.id}`;
    return !progress.translated[key];
  });
  
  console.log(`Questions to translate: ${needTranslation.length}`);
  
  if (needTranslation.length === 0) {
    console.log('All questions already translated!');
    return;
  }
  
  // Translate in batches
  for (let i = 0; i < needTranslation.length; i += BATCH_SIZE) {
    const batch = needTranslation.slice(i, i + BATCH_SIZE);
    const batchForTranslation = batch.map(q => ({
      id: q.id,
      q: q.q,
      o: q.o
    }));
    
    console.log(`Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(needTranslation.length / BATCH_SIZE)}...`);
    
    try {
      const translations = await translateWithGPT(batchForTranslation);
      
      // Save translations to progress
      translations.forEach((t, idx) => {
        const originalQ = batch[idx];
        const key = `${originalQ.type}-${originalQ.type === 'state' ? originalQ.state + '-' : ''}${originalQ.id}`;
        progress.translated[key] = {
          q: t.q,
          o: t.o
        };
      });
      
      await saveProgress(progress);
      console.log(`Batch saved. Total translated: ${Object.keys(progress.translated).length}`);
      
      if (i + BATCH_SIZE < needTranslation.length) {
        await sleep(DELAY_MS);
      }
    } catch (error) {
      console.error(`Error translating batch: ${error.message}`);
      console.log('Progress saved. You can resume later.');
      break;
    }
  }
  
  console.log('Translation complete!');
  console.log(`Run 'node scripts/applyLidTranslations.js' to apply translations to data file.`);
}

main().catch(console.error);
