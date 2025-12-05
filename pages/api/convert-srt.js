import fs from 'fs';
import path from 'path';
import { verifyToken } from '../../lib/jwt';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Translate text using OpenAI
async function translateWithOpenAI(text, targetLang) {
  if (!OPENAI_API_KEY) {
    return null;
  }

  const languageNames = {
    en: 'English',
    vi: 'Vietnamese'
  };

  const targetLanguageName = languageNames[targetLang] || targetLang;

  try {
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
            content: `You are a professional translator. Translate the German text to ${targetLanguageName}. Return ONLY the translation, nothing else.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error(`Translation error (${targetLang}):`, error.message);
    return null;
  }
}

// Translate all segments to both English and Vietnamese
async function translateAllSegments(segments) {
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (segment) => {
        const [translationEn, translationVi] = await Promise.all([
          translateWithOpenAI(segment.text, 'en'),
          translateWithOpenAI(segment.text, 'vi')
        ]);

        return {
          ...segment,
          translationEn: translationEn || '',
          translationVi: translationVi || ''
        };
      })
    );

    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < segments.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

function parseSRTTime(timeString) {
  const [hours, minutes, secondsAndMs] = timeString.split(':');
  const [seconds, milliseconds] = secondsAndMs.split(',');
  
  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(seconds) +
    parseInt(milliseconds) / 1000
  );
}

function convertSRTtoJSON(srtText) {
  const lines = srtText.trim().split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === '') {
      i++;
      continue;
    }

    const indexLine = lines[i].trim();
    if (!/^\d+$/.test(indexLine)) {
      i++;
      continue;
    }

    i++;
    if (i >= lines.length) break;

    const timeLine = lines[i].trim();
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    
    if (!timeMatch) {
      i++;
      continue;
    }

    const start = parseSRTTime(timeMatch[1]);
    const end = parseSRTTime(timeMatch[2]);

    i++;
    let text = '';
    while (i < lines.length && lines[i].trim() !== '' && !/^\d+$/.test(lines[i].trim())) {
      if (text) text += ' ';
      text += lines[i].trim();
      i++;
    }

    if (text) {
      result.push({
        text: text,
        start: start,
        end: end
      });
    }
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(401).json({ message: 'Không có quyền truy cập' });
    }

    const { srtText, lessonId, segments: whisperSegments } = req.body;

    if (!lessonId) {
      return res.status(400).json({ message: 'Thiếu lessonId' });
    }

    if (!srtText && !whisperSegments) {
      return res.status(400).json({ message: 'Thiếu dữ liệu SRT text hoặc segments' });
    }

    let jsonData;

    // Ưu tiên dùng segments từ Whisper V3 (có wordTimings)
    if (whisperSegments && whisperSegments.length > 0) {
      console.log(`Using Whisper V3 segments with wordTimings: ${whisperSegments.length} segments`);
      jsonData = whisperSegments.map(seg => ({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        wordTimings: seg.wordTimings || [] // Giữ nguyên wordTimings nếu có
      }));
    } else {
      // Fallback: parse từ SRT text
      jsonData = convertSRTtoJSON(srtText);
    }

    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'Không thể parse SRT text. Vui lòng kiểm tra định dạng.' });
    }

    // Translate all segments to English and Vietnamese
    if (OPENAI_API_KEY) {
      console.log(`Translating ${jsonData.length} segments to English and Vietnamese...`);
      jsonData = await translateAllSegments(jsonData);
      console.log('Translation completed!');
    } else {
      console.warn('OPENAI_API_KEY not configured, skipping translation');
    }

    const targetDir = path.join(process.cwd(), 'public', 'text');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fileName = `${lessonId}.json`;
    const targetPath = path.join(targetDir, fileName);

    fs.writeFileSync(targetPath, JSON.stringify(jsonData, null, 4), 'utf8');

    const url = `/text/${fileName}`;

    return res.status(200).json({
      success: true,
      url,
      fileName,
      itemCount: jsonData.length,
      hasTranslations: !!OPENAI_API_KEY
    });

  } catch (error) {
    console.error('Convert SRT error:', error);
    return res.status(500).json({ message: 'Lỗi convert SRT: ' + error.message });
  }
}
