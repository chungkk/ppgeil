/**
 * Whisper YouTube SRT v3
 * - SRT câu giống v2 (GPT thêm dấu câu, 6-20 từ/câu)
 * - THÊM: wordTimings array với timing từng từ để làm karaoke highlight
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

// Config - cải tiến chia câu
const MIN_WORDS = 5;          // Tối thiểu 5 từ/segment (tránh câu quá ngắn)
const IDEAL_MIN_WORDS = 6;    // Lý tưởng tối thiểu 6 từ
const IDEAL_MAX_WORDS = 10;   // Lý tưởng tối đa 10 từ
const MAX_WORDS = 14;         // Tối đa tuyệt đối 14 từ (trước: 12)
const MAX_CHAR_LENGTH = 180;  // Tối đa 180 ký tự (trước: 150)

// Buffer để bù đắp Whisper timestamp không chính xác
const START_BUFFER = 0.10;  // Lùi start 100ms để không mất từ đầu
const END_BUFFER = 0.50;    // Kéo dài end 500ms để từ cuối không bị cắt
const FIRST_WORD_BUFFER = 0.15; // Buffer thêm cho từ đầu câu (thường bị cắt nhiều hơn)
const GAP_THRESHOLD = 0.3;  // Ngưỡng gap giữa các từ cần fill (300ms)

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

    // Transcribe with Whisper - get word-level timestamps
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

    // Get words with timestamps
    const words = transcription.words || [];

    if (words.length === 0) {
      return res.status(400).json({
        message: 'Whisper không thể transcribe video này.'
      });
    }

    // Step 1: Get raw text from words
    const rawText = words.map(w => w.word).join('');

    // Step 2: Add punctuation using GPT (giống v2)
    const punctuatedWords = await addPunctuationToWords(words, rawText);

    // Step 3: Smart merge based on sentence boundaries + word count (giống v2)
    const segments = smartMergeWithPunctuation(punctuatedWords);

    // Step 4: Tạo wordTimings với text đã có dấu câu + fill gaps
    const rawWordTimings = punctuatedWords.map((w, index) => ({
      id: index,
      word: w.word.trim(),
      start: w.start,
      end: w.end,
      isFirstInSegment: w.isSegmentEnd ? false : (index === 0 || punctuatedWords[index - 1]?.isSegmentEnd),
      segmentIndex: findSegmentIndex(segments, index)
    }));

    // Fill gaps giữa các từ trong cùng segment
    const wordTimings = fillWordGaps(rawWordTimings);

    // Step 5: Gắn wordTimings vào từng segment với adaptive buffer
    const segmentsWithWordTimings = segments.map((seg, idx) => {
      // Lọc wordTimings thuộc segment này
      const segmentWords = wordTimings.filter(w => w.segmentIndex === idx);

      // Apply adaptive buffer cho từng từ trong segment
      const adjustedWords = segmentWords.map((w, i) => {
        const isFirst = i === 0;
        const isLast = i === segmentWords.length - 1;

        // Từ đầu tiên: buffer lớn hơn
        const startAdjust = isFirst ? FIRST_WORD_BUFFER : START_BUFFER;
        // Từ cuối: buffer kéo dài
        const endAdjust = isLast ? END_BUFFER : 0.05;

        return {
          word: w.word,
          start: Math.max(0, w.start - startAdjust),
          end: w.end + endAdjust,
          confidence: w.confidence || 1.0
        };
      });

      return {
        ...seg,
        index: idx,
        wordTimings: adjustedWords
      };
    });

    // Convert to SRT
    const srt = convertToSRT(segments);
    const itemCount = segments.length;

    return res.status(200).json({
      success: true,
      srt: srt,
      wordTimings: wordTimings,
      segments: segmentsWithWordTimings,
      itemCount: itemCount,
      videoDuration: videoDuration,
      videoTitle: videoTitle,
      message: `Whisper v3: ${itemCount} câu + ${wordTimings.length} từ với word-level timing`
    });

  } catch (error) {
    console.error('Whisper v3 error:', error);

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
      message: 'Lỗi Whisper v3: ' + error.message
    });
  }
}

// Tìm segment chứa word index
function findSegmentIndex(segments, wordIndex) {
  for (let i = 0; i < segments.length; i++) {
    if (wordIndex >= segments[i].wordStartIndex && wordIndex <= segments[i].wordEndIndex) {
      return i;
    }
  }
  return -1;
}

/**
 * Fill gaps giữa các từ trong cùng segment
 * Mục đích: Smooth timing, tránh gaps lớn và overlaps
 */
function fillWordGaps(words) {
  if (!words || words.length === 0) return words;

  const result = [...words];

  // Group words by segment
  const segmentGroups = {};
  for (const word of result) {
    const segIdx = word.segmentIndex;
    if (!segmentGroups[segIdx]) {
      segmentGroups[segIdx] = [];
    }
    segmentGroups[segIdx].push(word);
  }

  // Process each segment
  for (const segIdx of Object.keys(segmentGroups)) {
    const segmentWords = segmentGroups[segIdx];

    for (let i = 0; i < segmentWords.length - 1; i++) {
      const current = segmentWords[i];
      const next = segmentWords[i + 1];

      const gap = next.start - current.end;

      if (gap > GAP_THRESHOLD) {
        // Gap lớn: chia đều cho cả hai từ
        const midPoint = current.end + gap / 2;
        current.end = midPoint;
        next.start = midPoint;
        current.confidence = 0.8; // Đánh dấu confidence thấp hơn
        next.confidence = 0.8;
      } else if (gap > 0 && gap <= GAP_THRESHOLD) {
        // Gap nhỏ: kéo dài từ trước để lấp
        current.end = next.start;
      } else if (gap < 0) {
        // Overlap: điều chỉnh để tránh
        const midPoint = (current.end + next.start) / 2;
        current.end = midPoint;
        next.start = midPoint;
      }
    }
  }

  return result;
}

/**
 * Add punctuation AND smart segmentation using GPT
 * GPT trả về JSON array các segments
 */
async function addPunctuationToWords(words, rawText) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du bist ein professioneller deutscher Linguist und Untertitel-Experte.

AUFGABE: Analysiere den transkribierten Text semantisch und syntaktisch, füge korrekte Satzzeichen hinzu und teile ihn in natürliche Untertitel-Segmente.

⚠️ KRITISCHE REGELN (NIEMALS VERLETZEN):
1. JEDES Segment MUSS mit einem Satzzeichen enden: . ! ? , ; : –
2. NIEMALS mitten im Satz trennen (z.B. "zum Haus" | "ihrer Großmutter" ist VERBOTEN)
3. NIEMALS Präpositionalphrasen trennen (in/an/auf/bei/mit/zu/von + Artikel + Nomen)
4. NIEMALS Genitivattribute abtrennen (das Haus + der Großmutter = zusammen)
5. Lieber ein längeres Segment (bis 16 Wörter) als ein grammatisch falsches

LINGUISTISCHE ANALYSE:
1. Erkenne vollständige Satzstrukturen vor dem Trennen
2. Identifiziere Satzgrenzen durch: Punkt, Ausrufezeichen, Fragezeichen
3. Erkenne zusammengehörige Phrasen:
   - Präpositionalphrasen: "zum Haus ihrer Großmutter" (NICHT trennen!)
   - Genitivattribute: "die Tür des Hauses" (NICHT trennen!)
   - Infinitivkonstruktionen: "um zu arbeiten" (NICHT trennen!)
   - Relativsätze: ", der dort wohnt" (am Ende des Relativsatzes trennen)

SATZZEICHEN-REGELN:
- Punkt (.): Am Satzende, nach Aussagesätzen
- Komma (,): Vor Nebensätzen, bei Aufzählungen, nach Einschüben
- Fragezeichen (?): Bei direkten Fragen
- Ausrufezeichen (!): Bei Imperativen, Ausrufen

SEGMENTIERUNG (6-14 Wörter pro Segment):
- IDEAL: 7-12 Wörter pro Segment
- Trenne NUR bei: Satzende (. ! ?), Komma mit Nebensatz, Sprecherwechsel
- NIEMALS trennen: mitten in Phrasen, vor Genitivattributen, nach Präpositionen
- Wenn ein Satz >14 Wörter hat: Trenne nach Komma/Nebensatz, NICHT nach beliebigem Wort

BEISPLE - RICHTIG vs. FALSCH:

❌ FALSCH: ["Das Mädchen ging zum Haus", "ihrer Großmutter."]
   (Genitivattribut "ihrer Großmutter" wurde abgetrennt!)
✅ RICHTIG: ["Das Mädchen ging zum Haus ihrer Großmutter."]
   (Vollständiger Satz mit Genitivattribut)

❌ FALSCH: ["Er arbeitet in der", "großen Firma."]
   (Präpositionalphrase wurde getrennt!)
✅ RICHTIG: ["Er arbeitet in der großen Firma."]

❌ FALSCH: ["Sie wollte", "nach Hause gehen."]
   (Modalverb + Infinitiv getrennt!)
✅ RICHTIG: ["Sie wollte nach Hause gehen."]

✅ RICHTIG (lange Segmente OK): 
   ["Das kleine Mädchen mit dem roten Käppchen ging durch den dunklen Wald zum Haus ihrer Großmutter."]
   (16 Wörter aber EIN vollständiger Satz - NICHT trennen!)

✅ RICHTIG (Trennung bei Komma):
   Input: "das mädchen machte sich auf den weg weiche im wald nicht vom weg ab sagte die mutter"
   Output: ["Das Mädchen machte sich auf den Weg.", "„Weiche im Wald nicht vom Weg ab", sagte die Mutter."]

Antworte NUR mit JSON array. Keine Erklärung.`
        },
        {
          role: 'user',
          content: rawText
        }
      ],
      temperature: 0.2,
      max_tokens: 4096,
    });

    let segmentedText = response.choices[0].message.content.trim();

    // Parse JSON array
    let segments = [];
    try {
      // Loại bỏ markdown code block nếu có
      segmentedText = segmentedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      segments = JSON.parse(segmentedText);
    } catch (e) {
      console.error('JSON parse error, fallback to simple punctuation');
      // Fallback: dùng text đơn giản
      return mapPunctuationToWordsSimple(words, segmentedText);
    }

    return mapSegmentsToWords(words, segments);
  } catch (error) {
    console.error('GPT punctuation error:', error);
    return words.map(w => ({
      ...w,
      word: w.word,
      hasSentenceEnd: false,
      isSegmentEnd: false
    }));
  }
}

/**
 * Map GPT segments back to words with timestamps
 * IMPROVED: Better matching with character-level alignment fallback
 */
function mapSegmentsToWords(originalWords, segments) {
  const result = [];

  // Ghép tất cả segments thành danh sách tokens với thông tin segment
  const allTokens = [];
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segmentText = segments[segIdx];
    const tokens = segmentText.split(/\s+/).filter(t => t);
    for (let i = 0; i < tokens.length; i++) {
      allTokens.push({
        token: tokens[i],
        isSegmentEnd: i === tokens.length - 1,
        segmentIndex: segIdx
      });
    }
  }

  let tokenIndex = 0;
  let consecutiveMisses = 0; // Track consecutive mismatches

  for (let i = 0; i < originalWords.length; i++) {
    const origWord = originalWords[i];
    const cleanOrigWord = normalizeWord(origWord.word);

    let punctuatedWord = origWord.word.trim();
    let hasSentenceEnd = false;
    let isSegmentEnd = false;
    let matchConfidence = 1.0;

    if (tokenIndex < allTokens.length) {
      const tokenInfo = allTokens[tokenIndex];
      const punctToken = tokenInfo.token;
      const cleanPunctToken = normalizeWord(punctToken);

      // So sánh từ với nhiều chiến lược
      const matchResult = matchWords(cleanOrigWord, cleanPunctToken);

      if (matchResult.matched) {
        punctuatedWord = punctToken;
        hasSentenceEnd = /[.!?]$/.test(punctToken);
        isSegmentEnd = tokenInfo.isSegmentEnd;
        matchConfidence = matchResult.confidence;
        tokenIndex++;
        consecutiveMisses = 0;
      } else {
        // Mở rộng search window dựa trên số lần miss liên tiếp
        const searchWindow = Math.min(8 + consecutiveMisses * 2, 15);
        let found = false;

        for (let j = tokenIndex; j < Math.min(tokenIndex + searchWindow, allTokens.length); j++) {
          const searchInfo = allTokens[j];
          const searchToken = searchInfo.token;
          const cleanSearch = normalizeWord(searchToken);
          const searchMatch = matchWords(cleanOrigWord, cleanSearch);

          if (searchMatch.matched) {
            punctuatedWord = searchToken;
            hasSentenceEnd = /[.!?]$/.test(searchToken);
            isSegmentEnd = searchInfo.isSegmentEnd;
            matchConfidence = searchMatch.confidence * 0.9; // Giảm confidence vì phải tìm xa
            tokenIndex = j + 1;
            found = true;
            consecutiveMisses = 0;
            break;
          }
        }

        if (!found) {
          consecutiveMisses++;
          matchConfidence = 0.5; // Low confidence for unmatched words

          // Nếu miss nhiều liên tiếp, có thể GPT đã thay đổi nhiều
          // Reset tokenIndex để thử đồng bộ lại
          if (consecutiveMisses >= 5) {
            // Tìm điểm đồng bộ tiếp theo
            const syncPoint = findSyncPoint(originalWords, allTokens, i, tokenIndex);
            if (syncPoint !== -1) {
              tokenIndex = syncPoint;
              consecutiveMisses = 0;
            }
          }
        }
      }
    }

    result.push({
      word: punctuatedWord,
      start: origWord.start,
      end: origWord.end,
      hasSentenceEnd: hasSentenceEnd,
      isSegmentEnd: isSegmentEnd,
      confidence: matchConfidence
    });
  }

  return result;
}

/**
 * Normalize word for comparison
 */
function normalizeWord(word) {
  return word.trim().toLowerCase()
    .replace(/[.,!?;:„"''"»«›‹—–\-\(\)\[\]]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue');
}

/**
 * Match two words with multiple strategies
 */
function matchWords(word1, word2) {
  // Exact match
  if (word1 === word2) {
    return { matched: true, confidence: 1.0 };
  }

  // One contains the other (for compound words split differently)
  if (word1.includes(word2) || word2.includes(word1)) {
    const shorter = word1.length < word2.length ? word1 : word2;
    const longer = word1.length < word2.length ? word2 : word1;
    if (shorter.length >= 3 && shorter.length >= longer.length * 0.6) {
      return { matched: true, confidence: 0.85 };
    }
  }

  // Levenshtein distance - adaptive threshold based on word length
  const maxDistance = Math.max(2, Math.floor(Math.max(word1.length, word2.length) * 0.3));
  const distance = levenshtein(word1, word2);
  if (distance <= maxDistance) {
    const confidence = 1 - (distance / Math.max(word1.length, word2.length));
    return { matched: true, confidence: Math.max(0.6, confidence) };
  }

  // Start/end similarity (for prefixes/suffixes)
  const minLen = Math.min(word1.length, word2.length);
  if (minLen >= 4) {
    const startMatch = word1.substring(0, 4) === word2.substring(0, 4);
    const endMatch = word1.slice(-3) === word2.slice(-3);
    if (startMatch && endMatch) {
      return { matched: true, confidence: 0.7 };
    }
  }

  return { matched: false, confidence: 0 };
}

/**
 * Find a synchronization point when mapping gets out of sync
 */
function findSyncPoint(originalWords, allTokens, origIndex, tokenIndex) {
  // Look ahead in both arrays for a clear match
  for (let ahead = 1; ahead <= 10; ahead++) {
    const futureOrigIndex = origIndex + ahead;
    if (futureOrigIndex >= originalWords.length) break;

    const futureOrigWord = normalizeWord(originalWords[futureOrigIndex].word);

    for (let t = tokenIndex; t < Math.min(tokenIndex + 15, allTokens.length); t++) {
      const tokenWord = normalizeWord(allTokens[t].token);
      if (futureOrigWord === tokenWord && futureOrigWord.length >= 4) {
        // Found a sync point
        return t;
      }
    }
  }

  return -1;
}

/**
 * Fallback: simple punctuation mapping (giống v2)
 */
function mapPunctuationToWordsSimple(originalWords, punctuatedText) {
  const result = [];
  const punctuatedTokens = punctuatedText.split(/\s+/).filter(t => t);

  let punctIndex = 0;

  for (let i = 0; i < originalWords.length; i++) {
    const origWord = originalWords[i];
    const cleanOrigWord = origWord.word.trim().toLowerCase().replace(/[.,!?;:„"'-]/g, '');

    let punctuatedWord = origWord.word.trim();
    let hasSentenceEnd = false;

    if (punctIndex < punctuatedTokens.length) {
      const punctToken = punctuatedTokens[punctIndex];
      const cleanPunctToken = punctToken.toLowerCase().replace(/[.,!?;:„"'-]/g, '');

      if (cleanOrigWord === cleanPunctToken ||
        cleanOrigWord.includes(cleanPunctToken) ||
        cleanPunctToken.includes(cleanOrigWord)) {
        punctuatedWord = punctToken;
        hasSentenceEnd = /[.!?]$/.test(punctToken);
        punctIndex++;
      }
    }

    result.push({
      word: punctuatedWord,
      start: origWord.start,
      end: origWord.end,
      hasSentenceEnd: hasSentenceEnd,
      isSegmentEnd: hasSentenceEnd // fallback: dùng sentence end
    });
  }

  return result;
}

/**
 * Simple Levenshtein distance
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
 * Smart merge words into segments dựa vào GPT segmentation (isSegmentEnd)
 * CẢI TIẾN: 
 * - Xử lý câu quá ngắn (<MIN_WORDS): merge với segment tiếp theo
 * - Xử lý câu quá dài (>MAX_WORDS): split tại điểm tự nhiên (comma, conjunction)
 * - Post-processing để balance các segments
 */
function smartMergeWithPunctuation(words) {
  // Bước 1: Tạo raw segments dựa vào GPT segmentation
  const rawSegments = createRawSegments(words);

  // Bước 2: Merge các segment quá ngắn
  const mergedSegments = mergeShortSegments(rawSegments);

  // Bước 3: Split các segment quá dài
  const splitSegments = splitLongSegments(mergedSegments, words);

  // Bước 4: Final pass - đảm bảo không có segment quá ngắn/dài
  const finalSegments = finalizeSegments(splitSegments);

  return finalSegments;
}

/**
 * Bước 1: Tạo raw segments từ GPT markers
 */
function createRawSegments(words) {
  const segments = [];
  let currentSegment = {
    words: [],
    wordIndices: [],
    start: 0,
    end: 0
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const nextWord = words[i + 1];

    if (currentSegment.words.length === 0) {
      currentSegment.start = word.start;
    }

    currentSegment.words.push(word);
    currentSegment.wordIndices.push(i);
    currentSegment.end = word.end;

    const isGptSegmentEnd = word.isSegmentEnd;
    const isLastWord = !nextWord;
    const hasSentenceEnd = word.hasSentenceEnd;

    // Push segment khi GPT đánh dấu hoặc cuối văn bản
    if (isGptSegmentEnd || isLastWord || hasSentenceEnd) {
      segments.push({ ...currentSegment });
      currentSegment = { words: [], wordIndices: [], start: 0, end: 0 };
    }
  }

  return segments;
}

/**
 * Bước 2: Merge các segment quá ngắn VÀ segment kết thúc giữa câu
 * CẢI TIẾN: Kiểm tra segment có kết thúc đúng không
 */
function mergeShortSegments(segments) {
  if (segments.length <= 1) return segments;

  const merged = [];
  let i = 0;

  while (i < segments.length) {
    let current = { ...segments[i] };
    current.words = [...segments[i].words];
    current.wordIndices = [...segments[i].wordIndices];

    // Điều kiện merge:
    // 1. Segment quá ngắn (<MIN_WORDS)
    // 2. Segment kết thúc giữa câu (từ cuối không có dấu câu + từ đầu segment sau là lowercase)
    while (i + 1 < segments.length) {
      const next = segments[i + 1];
      const shouldMerge = shouldMergeWithNext(current, next);

      if (!shouldMerge) break;

      // Merge với segment tiếp theo
      current.words = [...current.words, ...next.words];
      current.wordIndices = [...current.wordIndices, ...next.wordIndices];
      current.end = next.end;

      i++;

      // Nếu đã quá dài, dừng merge
      if (current.words.length >= MAX_WORDS) {
        break;
      }
    }

    merged.push(current);
    i++;
  }

  return merged;
}

/**
 * Kiểm tra xem có nên merge segment hiện tại với segment tiếp theo không
 */
function shouldMergeWithNext(current, next) {
  if (!next || next.words.length === 0) return false;

  const currentWordCount = current.words.length;
  const nextWordCount = next.words.length;

  // Lý do 1: Segment hiện tại quá ngắn
  if (currentWordCount < MIN_WORDS) {
    return true;
  }

  // Lý do 2: Segment kết thúc giữa câu
  const lastWord = current.words[current.words.length - 1];
  const lastWordText = lastWord.word.trim();
  const firstWordOfNext = next.words[0].word.trim();

  // Kiểm tra từ cuối có dấu câu kết thúc không
  const hasPunctuation = /[.!?;:]$/.test(lastWordText);
  const hasComma = /,$/.test(lastWordText);

  // Kiểm tra từ đầu segment tiếp theo
  const nextStartsLowercase = /^[a-zäöüß]/.test(firstWordOfNext);
  const nextStartsWithConjunction = /^(aber|oder|und|sondern|denn|weil|dass|wenn|obwohl|während|bevor|nachdem|doch|jedoch|also|deshalb|daher|trotzdem)$/i.test(firstWordOfNext.replace(/[.,]/g, ''));

  // Nếu từ cuối là genitive article hoặc preposition, chắc chắn phải merge
  const endsWithGenitiveTrigger = /^(des|der|eines|einer|meiner|deiner|seiner|ihrer|unserer|eurer)$/i.test(lastWordText);
  const endsWithPreposition = /^(in|an|auf|bei|mit|zu|von|für|über|unter|zwischen|hinter|vor|neben|nach|aus|durch|gegen|ohne|um|bis|seit|während|wegen|trotz|statt|anstatt)$/i.test(lastWordText);

  if (endsWithGenitiveTrigger || endsWithPreposition) {
    return true;
  }

  // Nếu không có dấu câu VÀ từ tiếp theo là lowercase (không phải conjunction đứng đầu câu mới)
  if (!hasPunctuation && !hasComma && nextStartsLowercase && !nextStartsWithConjunction) {
    // Từ tiếp theo là lowercase → có thể đang ở giữa câu
    return true;
  }

  // Nếu có dấu phẩy VÀ từ tiếp theo là lowercase VÀ không phải conjunction
  // → có thể là dấu phẩy trong cụm từ, không phải kết thúc clause
  if (hasComma && nextStartsLowercase && !nextStartsWithConjunction) {
    // Chỉ merge nếu tổng không quá dài
    if (currentWordCount + nextWordCount <= IDEAL_MAX_WORDS) {
      return true;
    }
  }

  return false;
}

/**
 * Bước 3: Split các segment quá dài tại điểm tự nhiên
 */
function splitLongSegments(segments, allWords) {
  const result = [];

  for (const segment of segments) {
    if (segment.words.length <= MAX_WORDS) {
      result.push(segment);
      continue;
    }

    // Segment quá dài - cần split
    const splitPoints = findNaturalSplitPoints(segment.words);
    const subSegments = splitAtPoints(segment, splitPoints);
    result.push(...subSegments);
  }

  return result;
}

/**
 * Tìm các điểm split tự nhiên trong segment
 * CẢI TIẾN: Chỉ split tại điểm AN TOÀN - sau dấu câu hoặc trước conjunction
 * KHÔNG BAO GIỜ split sau preposition, article, genitive trigger
 */
function findNaturalSplitPoints(words) {
  const points = [];

  // Danh sách từ KHÔNG ĐƯỢC split sau (sẽ tạo fragment)
  const UNSAFE_ENDINGS = [
    // Prepositions
    'in', 'an', 'auf', 'bei', 'mit', 'zu', 'von', 'für', 'über', 'unter',
    'zwischen', 'hinter', 'vor', 'neben', 'nach', 'aus', 'durch', 'gegen',
    'ohne', 'um', 'bis', 'seit', 'während', 'wegen', 'trotz', 'statt', 'anstatt',
    'zum', 'zur', 'beim', 'vom', 'im', 'am', 'ins', 'ans', 'aufs',
    // Articles
    'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einen', 'einem', 'einer',
    // Genitive articles
    'des', 'eines', 'meines', 'deines', 'seines', 'ihres', 'unseres', 'eures',
    // Possessive
    'mein', 'meine', 'dein', 'deine', 'sein', 'seine', 'ihr', 'ihre', 'unser', 'unsere', 'euer', 'eure',
    // Demonstrative
    'dieser', 'diese', 'dieses', 'diesen', 'diesem', 'jener', 'jene', 'jenes',
    // Relative pronouns (beginning)
    'welcher', 'welche', 'welches', 'welchen', 'welchem',
  ];

  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i].word;
    const cleanWord = word.toLowerCase().replace(/[.,!?;:„"]/g, '');
    const nextWord = words[i + 1]?.word || '';
    const nextCleanWord = nextWord.toLowerCase().replace(/[.,!?;:„"]/g, '');

    // KHÔNG split nếu từ hiện tại là unsafe ending
    if (UNSAFE_ENDINGS.includes(cleanWord)) {
      continue;
    }

    // KHÔNG split nếu từ tiếp theo bắt đầu bằng lowercase (trừ conjunction)
    const isNextLowercase = /^[a-zäöüß]/.test(nextWord);
    const isNextConjunction = ['aber', 'oder', 'und', 'sondern', 'denn', 'weil', 'dass', 'wenn', 'obwohl', 'während', 'bevor', 'nachdem', 'doch', 'jedoch', 'also', 'deshalb', 'daher'].includes(nextCleanWord);

    // Điểm TỐT NHẤT: sau dấu câu kết thúc (. ! ?)
    if (/[.!?]$/.test(word)) {
      points.push({ index: i, priority: 0, type: 'sentenceEnd' });
    }
    // Điểm TỐT: sau dấu phẩy + từ tiếp theo là conjunction hoặc uppercase
    else if (/,$/.test(word)) {
      if (isNextConjunction || !isNextLowercase) {
        points.push({ index: i, priority: 1, type: 'comma+safe' });
      } else {
        // Comma nhưng tiếp theo là lowercase - ít an toàn hơn
        points.push({ index: i, priority: 3, type: 'comma+risky' });
      }
    }
    // Điểm CHẤP NHẬN: trước conjunction (split trước conjunction)
    else if (isNextConjunction && i >= MIN_WORDS - 1) {
      points.push({ index: i, priority: 2, type: 'beforeConjunction' });
    }
    // Điểm SAU DÙNG: sau chữ hoa (có thể là kết thúc tên riêng hoặc câu)
    else if (/[A-ZÄÖÜ]/.test(word.charAt(0)) && !isNextLowercase && i >= 4) {
      points.push({ index: i, priority: 4, type: 'afterProperNoun' });
    }
  }

  // Sắp xếp theo priority (số nhỏ = ưu tiên cao)
  return points.sort((a, b) => a.priority - b.priority);
}

/**
 * Split segment tại các điểm đã tìm
 */
function splitAtPoints(segment, splitPoints) {
  const words = segment.words;
  const wordIndices = segment.wordIndices;

  if (splitPoints.length === 0) {
    // Không tìm được điểm tự nhiên - split ở giữa
    const midPoint = Math.floor(words.length / 2);
    // Tìm điểm gần giữa nhất mà hợp lý (6-10 từ mỗi phần)
    return splitAtIndex(segment, midPoint);
  }

  // Tìm điểm split tốt nhất (gần với tỷ lệ 50-50 nhất)
  const targetSplit = Math.floor(words.length / 2);
  let bestPoint = splitPoints[0];
  let bestDistance = Math.abs(bestPoint.index - targetSplit);

  for (const point of splitPoints) {
    // Chỉ xét các điểm tạo ra segment có ít nhất MIN_WORDS từ
    if (point.index + 1 < MIN_WORDS || words.length - point.index - 1 < MIN_WORDS) {
      continue;
    }

    const distance = Math.abs(point.index - targetSplit);
    // Ưu tiên điểm có priority cao hơn nếu khoảng cách gần nhau
    if (distance < bestDistance || (distance === bestDistance && point.priority < bestPoint.priority)) {
      bestPoint = point;
      bestDistance = distance;
    }
  }

  // Đảm bảo split tạo ra các phần hợp lệ
  let splitIndex = bestPoint.index;
  if (splitIndex < MIN_WORDS - 1) {
    splitIndex = MIN_WORDS - 1;
  }
  if (words.length - splitIndex - 1 < MIN_WORDS) {
    splitIndex = words.length - MIN_WORDS;
  }

  return splitAtIndex(segment, splitIndex);
}

/**
 * Split segment tại một index cụ thể
 */
function splitAtIndex(segment, splitIndex) {
  const words = segment.words;
  const wordIndices = segment.wordIndices;

  if (splitIndex <= 0 || splitIndex >= words.length - 1) {
    return [segment]; // Không thể split
  }

  const first = {
    words: words.slice(0, splitIndex + 1),
    wordIndices: wordIndices.slice(0, splitIndex + 1),
    start: segment.start,
    end: words[splitIndex].end
  };

  const second = {
    words: words.slice(splitIndex + 1),
    wordIndices: wordIndices.slice(splitIndex + 1),
    start: words[splitIndex + 1].start,
    end: segment.end
  };

  // Kiểm tra nếu second vẫn quá dài, tiếp tục split
  const result = [first];
  if (second.words.length > MAX_WORDS) {
    const subSplitPoints = findNaturalSplitPoints(second.words);
    result.push(...splitAtPoints(second, subSplitPoints));
  } else {
    result.push(second);
  }

  return result;
}

/**
 * Bước 4: Finalize - tạo segment objects với text và timing
 */
function finalizeSegments(segments) {
  const result = [];

  for (const seg of segments) {
    if (seg.words.length === 0) continue;

    // Build text
    let text = '';
    for (let i = 0; i < seg.words.length; i++) {
      const w = seg.words[i];
      if (i === 0) {
        text = w.word.trim();
      } else {
        const prevWord = seg.words[i - 1].word;
        if (/[„]$/.test(prevWord)) {
          text += w.word.trim();
        } else {
          text += ' ' + w.word.trim();
        }
      }
    }

    text = cleanText(text);

    if (text) {
      // Áp dụng buffer để bù đắp Whisper timestamp không chính xác
      const bufferedStart = Math.max(0, seg.start - START_BUFFER);
      const bufferedEnd = seg.end + END_BUFFER;

      result.push({
        text: text,
        start: bufferedStart,
        end: bufferedEnd,
        wordStartIndex: seg.wordIndices[0],
        wordEndIndex: seg.wordIndices[seg.wordIndices.length - 1],
        wordCount: seg.words.length
      });
    }
  }

  return result;
}

function cleanText(text) {
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

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
