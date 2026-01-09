/**
 * Whisper YouTube SRT v4 - Karaoke V2
 * 
 * Flow:
 * 1. Whisper transcribe → word-level timestamps
 * 2. OpenAI nhận raw text → sắp xếp câu + dấu câu thông minh
 * 3. Map timestamps từ Whisper vào segments của OpenAI
 */

import { Innertube } from 'youtubei.js';
import { OpenAI } from 'openai';
import { verifyToken } from '../../lib/jwt';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
  maxDuration: 300,
};

const execAsync = promisify(exec);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Download audio từ YouTube
async function downloadYouTubeAudio(videoId, outputPath) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const command = `yt-dlp -f bestaudio --no-playlist -o "${outputPath}" "${url}"`;

  try {
    await execAsync(command, { timeout: 180000 });
    return outputPath;
  } catch (error) {
    const possibleFiles = [
      outputPath,
      outputPath.replace('.webm', '.m4a'),
      outputPath.replace('.webm', '.opus'),
    ];

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        return file;
      }
    }

    if (fs.existsSync(outputPath + '.webm')) {
      return outputPath + '.webm';
    }

    throw new Error('yt-dlp download failed: ' + error.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let tempFilePath = null;

  try {
    // Verify admin token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(401).json({ message: 'Không có quyền truy cập' });
    }

    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'Thiếu YouTube URL' });
    }

    // Extract video ID
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ message: 'URL YouTube không hợp lệ' });
    }

    const videoId = videoIdMatch[1];

    // Get video info
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);

    const videoTitle = info.basic_info?.title || '';
    const videoDuration = info.basic_info?.duration || 0;

    // Check video duration (limit to 30 minutes)
    if (videoDuration > 1800) {
      return res.status(400).json({
        message: `Video quá dài (${Math.floor(videoDuration / 60)} phút). Whisper API chỉ hỗ trợ video tối đa 30 phút.`
      });
    }

    // Download audio
    const tempDir = '/tmp';
    const basePath = path.join(tempDir, `youtube_${videoId}_${Date.now()}`);

    try {
      tempFilePath = await downloadYouTubeAudio(videoId, basePath + '.webm');
    } catch (downloadError) {
      console.error('yt-dlp download error:', downloadError.message);
      return res.status(400).json({
        message: 'Không thể tải audio từ video này: ' + downloadError.message
      });
    }

    if (!tempFilePath || !fs.existsSync(tempFilePath)) {
      return res.status(400).json({
        message: 'Không thể tải audio từ video này.'
      });
    }

    // Check file size (Whisper API limit is 25MB)
    const stats = fs.statSync(tempFilePath);
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({
        message: 'File audio quá lớn (>25MB). Vui lòng chọn video ngắn hơn.'
      });
    }

    // ========== STEP 1: Whisper transcribe với word-level timestamps ==========
    console.log('Step 1: Whisper transcribing...');
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'de',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      tempFilePath = null;
    }

    const whisperWords = transcription.words || [];

    if (whisperWords.length === 0) {
      return res.status(400).json({
        message: 'Whisper không thể transcribe video này.'
      });
    }

    // Lấy raw text từ Whisper
    const rawText = whisperWords.map(w => w.word).join(' ').replace(/\s+/g, ' ').trim();
    console.log('Whisper raw text:', rawText.substring(0, 200) + '...');

    // ========== STEP 2: OpenAI sắp xếp câu + dấu câu ==========
    console.log('Step 2: OpenAI formatting...');
    const formattedSegments = await formatTextWithOpenAI(rawText);
    console.log('OpenAI segments:', formattedSegments.length);

    // ========== STEP 3: Map timestamps từ Whisper vào segments ==========
    console.log('Step 3: Mapping timestamps...');
    const segmentsWithTimings = mapTimestampsToSegments(whisperWords, formattedSegments);

    // Convert to SRT
    const srt = convertToSRT(segmentsWithTimings);
    const itemCount = segmentsWithTimings.length;

    return res.status(200).json({
      success: true,
      srt: srt,
      segments: segmentsWithTimings,
      itemCount: itemCount,
      videoDuration: videoDuration,
      videoTitle: videoTitle,
      message: `Karaoke V2: ${itemCount} câu với word-level timing`
    });

  } catch (error) {
    console.error('Whisper v4 error:', error);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.error('Failed to clean up temp file:', e);
      }
    }

    if (error.message?.includes('This video is unavailable')) {
      return res.status(404).json({
        message: 'Video không khả dụng hoặc đã bị xóa'
      });
    }

    return res.status(500).json({
      message: 'Lỗi Whisper v4: ' + error.message
    });
  }
}

/**
 * STEP 2: Gửi raw text cho OpenAI để sắp xếp câu + dấu câu
 * Trả về array các segments với text đã format
 */
async function formatTextWithOpenAI(rawText) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du bist ein professioneller deutscher Linguist. Deine Aufgabe ist es, den transkribierten Text in kurze Segmente zu gliedern und korrekte Satzzeichen hinzuzufügen.

WICHTIGE REGELN:

1. SATZZEICHEN:
   - Füge Punkte (.), Fragezeichen (?), Ausrufezeichen (!), Kommas (,) hinzu
   - Verwende deutsche Anführungszeichen „..." für direkte Rede
   - Großschreibung am Satzanfang und bei Nomen

2. SEGMENTLÄNGE (SEHR WICHTIG!):
   - Ideal: 5-10 Wörter pro Segment
   - Maximum: 12 Wörter pro Segment
   - NIEMALS mehr als 12 Wörter in einem Segment!
   - Bei langen Sätzen: MUSS bei Komma trennen!

3. TRENNREGELN FÜR LANGE SÄTZE:
   - Wenn ein Satz mehr als 10-12 Wörter hat, MUSS er getrennt werden
   - Trenne bei jedem Komma in langen Sätzen
   - Beispiel: "Heute ist mal wieder einer dieser Tage, an dem diese unangenehme Emotion namens Angst langsam, aber stetig erst meine Gedanken erobert."
   - Wird zu: ["Heute ist mal wieder einer dieser Tage,", "an dem diese unangenehme Emotion namens Angst langsam,", "aber stetig erst meine Gedanken erobert."]

4. NIEMALS TRENNEN:
   - Präpositionalphrasen: "zum Haus ihrer Großmutter" (zusammen!)
   - Genitivattribute: "das Haus des Mannes" (zusammen!)
   - Artikel + Nomen: "der Mann", "eine Frau"

5. TEXT NICHT ÄNDERN:
   - Keine Wörter hinzufügen oder entfernen
   - Nur Satzzeichen und Großschreibung anpassen
   - Reihenfolge der Wörter beibehalten

Antworte NUR mit einem JSON Array von Strings. Jeder String ist ein Segment.`
        },
        {
          role: 'user',
          content: rawText
        }
      ],
      temperature: 0.1,
      max_tokens: 4096,
    });

    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Parse JSON
    const segments = JSON.parse(content);
    
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new Error('OpenAI returned invalid format');
    }

    return segments;
  } catch (error) {
    console.error('OpenAI formatting error:', error);
    // Fallback: split by simple rules
    return fallbackSplitText(rawText);
  }
}

/**
 * Fallback nếu OpenAI lỗi: split text đơn giản
 */
function fallbackSplitText(rawText) {
  const words = rawText.split(/\s+/);
  const segments = [];
  let current = [];

  for (const word of words) {
    current.push(word);
    
    // Split every 8-10 words
    if (current.length >= 8) {
      segments.push(current.join(' ') + '.');
      current = [];
    }
  }

  if (current.length > 0) {
    segments.push(current.join(' ') + '.');
  }

  return segments;
}

/**
 * STEP 3: Map timestamps từ Whisper words vào OpenAI segments
 * 
 * Logic:
 * - Với mỗi segment từ OpenAI, tìm các từ tương ứng trong Whisper
 * - Dùng normalized matching để đối chiếu
 * - Gắn start/end time cho từng từ và cho cả segment
 */
function mapTimestampsToSegments(whisperWords, openaiSegments) {
  const results = [];
  let whisperIndex = 0;

  for (let segIdx = 0; segIdx < openaiSegments.length; segIdx++) {
    const segmentText = openaiSegments[segIdx];
    const segmentWords = segmentText.split(/\s+/).filter(w => w);
    
    const wordTimings = [];
    let segmentStart = null;
    let segmentEnd = null;

    for (const openaiWord of segmentWords) {
      const normalizedOpenai = normalizeWord(openaiWord);
      
      // Tìm từ matching trong Whisper
      let matched = false;
      let searchLimit = Math.min(whisperIndex + 10, whisperWords.length);
      
      for (let i = whisperIndex; i < searchLimit; i++) {
        const whisperWord = whisperWords[i];
        const normalizedWhisper = normalizeWord(whisperWord.word);
        
        if (wordsMatch(normalizedOpenai, normalizedWhisper)) {
          // Found match
          const timing = {
            word: openaiWord,
            start: whisperWord.start,
            end: whisperWord.end
          };
          
          wordTimings.push(timing);
          
          if (segmentStart === null) {
            segmentStart = whisperWord.start;
          }
          segmentEnd = whisperWord.end;
          
          whisperIndex = i + 1;
          matched = true;
          break;
        }
      }

      // Nếu không match, ước tính timing
      if (!matched) {
        const lastTiming = wordTimings[wordTimings.length - 1];
        const estimatedStart = lastTiming ? lastTiming.end : (segmentStart || 0);
        const estimatedEnd = estimatedStart + 0.3; // 300ms per word estimate
        
        wordTimings.push({
          word: openaiWord,
          start: estimatedStart,
          end: estimatedEnd,
          estimated: true
        });
        
        if (segmentStart === null) {
          segmentStart = estimatedStart;
        }
        segmentEnd = estimatedEnd;
      }
    }

    // Apply buffer để timing mượt hơn
    const START_BUFFER = 0.1;
    const END_BUFFER = 0.3;

    results.push({
      index: segIdx,
      text: segmentText,
      start: Math.max(0, (segmentStart || 0) - START_BUFFER),
      end: (segmentEnd || 0) + END_BUFFER,
      wordTimings: wordTimings.map((wt, i) => ({
        ...wt,
        start: i === 0 ? Math.max(0, wt.start - START_BUFFER) : wt.start,
        end: i === wordTimings.length - 1 ? wt.end + END_BUFFER : wt.end
      }))
    });
  }

  return results;
}

/**
 * Normalize word để so sánh
 */
function normalizeWord(word) {
  return word
    .toLowerCase()
    .replace(/[.,!?;:„"''""»«›‹—–\-\(\)\[\]]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .trim();
}

/**
 * Check if two words match
 */
function wordsMatch(word1, word2) {
  if (word1 === word2) return true;
  
  // One contains the other
  if (word1.length >= 3 && word2.length >= 3) {
    if (word1.includes(word2) || word2.includes(word1)) {
      return true;
    }
  }
  
  // Levenshtein distance
  const maxDist = Math.max(1, Math.floor(Math.max(word1.length, word2.length) * 0.3));
  const dist = levenshtein(word1, word2);
  
  return dist <= maxDist;
}

/**
 * Levenshtein distance
 */
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Convert segments to SRT format
 */
function convertToSRT(segments) {
  const formatTime = (seconds) => {
    const pad = (n, z = 2) => ("00" + n).slice(-z);
    const ms = Math.round((seconds % 1) * 1000);
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
  };

  return segments.map((seg, index) => {
    const num = index + 1;
    const start = formatTime(seg.start);
    const end = formatTime(seg.end);
    return `${num}\n${start} --> ${end}\n${seg.text}`;
  }).join('\n\n');
}
