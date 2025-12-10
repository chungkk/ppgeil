import { promises as fs } from 'fs';
import path from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const LANGUAGE_NAMES = {
  vi: 'tiếng Việt',
  en: 'English',
  de: 'Deutsch'
};

async function extractVocabularyWithAI(fullText, level, targetLang = 'vi') {
  const apiKey = OPENAI_API_KEY || GROQ_API_KEY;
  const isOpenAI = !!OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('No AI API key available');
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang;

  const prompt = `Du bist ein Experte für Deutsch als Fremdsprache. Analysiere den folgenden deutschen Text und extrahiere LERNWÜRDIGE Vokabeln für Deutschlerner auf dem Niveau ${level}.

TEXT:
"""
${fullText}
"""

Extrahiere 15-30 LERNWÜRDIGE Wörter/Ausdrücke und gib ein JSON-Array zurück (KEIN Markdown, nur reines JSON):

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

WICHTIG - DIESE WÖRTER NIEMALS EXTRAHIEREN (zu grundlegend):
- Hilfsverben: sein, haben, werden
- Modalverben: können, müssen, wollen, sollen, dürfen, mögen, möchten
- Zu einfache Verben: gehen, kommen, machen, sagen, sehen, hören, nehmen, geben, wissen, denken, finden, stehen, liegen, bleiben, lassen
- Pronomen: ich, du, er, sie, es, wir, ihr, man, was, wer, wie, wo, wann, warum
- Artikel: der, die, das, ein, eine
- Präpositionen: in, an, auf, mit, von, zu, bei, nach, für, aus, um, über, unter, vor, hinter, zwischen, neben
- Konjunktionen: und, oder, aber, weil, dass, wenn, als, ob, denn, sondern
- Zahlen und sehr einfache Adjektive: gut, schlecht, groß, klein, neu, alt, viel, wenig

BEVORZUGE STATTDESSEN:
- Konkrete NOMEN mit spezifischer Bedeutung (z.B. "die Entscheidung", "der Vorschlag", "die Möglichkeit")
- Beschreibende ADJEKTIVE (z.B. "wichtig", "schwierig", "notwendig", "erfolgreich")
- Spezifische VERBEN mit klarer Handlung (z.B. "entscheiden", "vorschlagen", "erklären", "entwickeln")
- ADVERBIEN (z.B. "eigentlich", "tatsächlich", "wahrscheinlich", "offensichtlich")
- Nützliche PHRASEN und REDEWENDUNGEN (z.B. "es geht um", "im Gegensatz zu", "auf jeden Fall")
- ZUSAMMENGESETZTE WÖRTER (Komposita) - diese sind sehr wichtig im Deutschen!

Anforderungen:
- Wähle Wörter, die für ${level}-Lerner LERNWERT haben
- Bei Nomen IMMER mit Artikel (der/die/das)
- Bei Verben die Infinitivform als baseForm
- Bei trennbaren Verben: baseForm = Infinitiv (z.B. "ankommen")
- Sortiere nach Lernwert und Relevanz für das Thema des Textes`;

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
  
  // Remove markdown code blocks if present
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
      sentences: sentences.slice(0, 5) // max 5 sentences per word
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { lessonId, transcript, level = 'B1', targetLang = 'vi', save = true } = req.body;

  if (!lessonId && !transcript) {
    return res.status(400).json({ success: false, message: 'lessonId or transcript is required' });
  }

  try {
    let transcriptData = transcript;
    let lessonLevel = level;

    // If lessonId provided, load transcript from file
    if (lessonId && !transcript) {
      const jsonPath = path.join(process.cwd(), 'public', 'text', `${lessonId}.json`);
      
      try {
        const jsonContent = await fs.readFile(jsonPath, 'utf-8');
        transcriptData = JSON.parse(jsonContent);
      } catch (err) {
        return res.status(404).json({ 
          success: false, 
          message: `Transcript file not found: ${lessonId}.json` 
        });
      }
    }

    if (!Array.isArray(transcriptData) || transcriptData.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid transcript data' });
    }

    // Combine all sentences into full text
    const fullText = transcriptData.map(s => s.text).join('\n');

    // Extract vocabulary using AI
    console.log(`🔍 Extracting vocabulary for: ${lessonId || 'custom transcript'}`);
    const rawVocabulary = await extractVocabularyWithAI(fullText, lessonLevel, targetLang);

    // Find sentence indices for each word
    const vocabulary = findSentenceIndices(rawVocabulary, transcriptData);

    const vocabData = {
      lessonId: lessonId || 'custom',
      level: lessonLevel,
      targetLang: targetLang,
      extractedAt: new Date().toISOString(),
      totalWords: vocabulary.length,
      vocabulary: vocabulary
    };

    // Save to file if lessonId provided and save=true
    if (lessonId && save) {
      const vocabPath = path.join(process.cwd(), 'public', 'text', `${lessonId}.vocab.json`);
      await fs.writeFile(vocabPath, JSON.stringify(vocabData, null, 2), 'utf-8');
      console.log(`✅ Saved vocabulary to: ${lessonId}.vocab.json`);
    }

    return res.status(200).json({
      success: true,
      data: vocabData,
      saved: lessonId && save
    });

  } catch (error) {
    console.error('Extract vocabulary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to extract vocabulary',
      error: error.message
    });
  }
}
