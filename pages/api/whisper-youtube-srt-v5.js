/**
 * Whisper YouTube SRT v5 - HYBRID
 * 
 * Kết hợp 2 nguồn để có SRT chất lượng tốt nhất:
 * - YouTube Captions: Text chính xác (đã verify)
 * - Whisper: Word-level timestamps chính xác
 * 
 * Flow:
 * 1. Lấy YouTube captions (text chính xác)
 * 2. Lấy Whisper timestamps (word-level timing)
 * 3. Merge: Text từ YouTube + Timing từ Whisper
 * 4. GPT thêm dấu câu
 * 5. Smart segmentation
 * 
 * Fallback: Nếu YouTube không có captions → dùng Whisper hoàn toàn (như v4)
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

// ============ CONFIGURATION ============
const MIN_WORDS_PER_SEGMENT = 6;      // Tối thiểu 6 từ (tăng từ 5)
const IDEAL_WORDS_PER_SEGMENT = 8;    // Lý tưởng 8 từ (tăng từ 7)
const MAX_WORDS_PER_SEGMENT = 14;     // Tối đa 14 từ (tăng từ 12)
const GAP_THRESHOLD_MS = 700;         // Chỉ cắt khi gap > 700ms (tăng từ 500)
const SENTENCE_END_PATTERN = /[.!?]$/;
const CLAUSE_END_PATTERN = /[,;:]$/;

// Patterns để lọc intro/outro
const FILTER_PATTERNS = [
    /^untertitel/i,
    /im auftrag/i,
    /\bZDF\b/i,
    /\bfunk\b/i,
    /^\d{4}$/,
    /copyright/i,
    /^musik$/i,
    /^\[.*\]$/,
];

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

        const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        if (!videoIdMatch) {
            return res.status(400).json({ message: 'URL YouTube không hợp lệ' });
        }

        const videoId = videoIdMatch[1];

        // Initialize YouTube client
        const youtube = await Innertube.create();
        const info = await youtube.getInfo(videoId);

        const videoTitle = info.basic_info?.title || '';
        const videoDuration = info.basic_info?.duration || 0;

        if (videoDuration > 1800) {
            return res.status(400).json({
                message: `Video quá dài (${Math.floor(videoDuration / 60)} phút). Tối đa 30 phút.`
            });
        }

        // ========== STEP 1: Lấy YouTube Captions ==========
        console.log('Step 1: Fetching YouTube captions...');
        let youtubeWords = null;
        let hasYouTubeCaptions = false;

        try {
            let transcriptData = await info.getTranscript();
            if (transcriptData?.transcript) {
                transcriptData = await prioritizeGermanLanguage(transcriptData);
                const segments = transcriptData.transcript.content?.body?.initial_segments || [];
                if (segments.length > 0) {
                    youtubeWords = extractWordsFromYouTubeSegments(segments);
                    hasYouTubeCaptions = youtubeWords.length > 0;
                    console.log('YouTube words:', youtubeWords.length);
                }
            }
        } catch (ytError) {
            console.log('No YouTube captions available:', ytError.message);
        }

        // ========== STEP 2: Lấy Whisper Timestamps ==========
        console.log('Step 2: Getting Whisper word-level timestamps...');

        const tempDir = '/tmp';
        const basePath = path.join(tempDir, `youtube_${videoId}_${Date.now()}`);

        try {
            tempFilePath = await downloadYouTubeAudio(videoId, basePath + '.webm');
        } catch (downloadError) {
            return res.status(400).json({
                message: 'Không thể tải audio: ' + downloadError.message
            });
        }

        if (!tempFilePath || !fs.existsSync(tempFilePath)) {
            return res.status(400).json({ message: 'Không thể tải audio.' });
        }

        const stats = fs.statSync(tempFilePath);
        if (stats.size > 25 * 1024 * 1024) {
            fs.unlinkSync(tempFilePath);
            return res.status(400).json({ message: 'File audio quá lớn (>25MB).' });
        }

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-1',
            language: 'de',
            response_format: 'verbose_json',
            timestamp_granularities: ['word'],
        });

        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            tempFilePath = null;
        }

        const whisperWords = transcription.words || [];
        console.log('Whisper words:', whisperWords.length);

        if (whisperWords.length === 0) {
            return res.status(400).json({ message: 'Whisper không transcribe được.' });
        }

        // ========== STEP 3: Merge YouTube + Whisper ==========
        console.log('Step 3: Merging sources...');
        let mergedWords;
        let sourceInfo;

        if (hasYouTubeCaptions) {
            // HYBRID: Text từ YouTube + Timing từ Whisper
            mergedWords = mergeYouTubeAndWhisper(youtubeWords, whisperWords);
            sourceInfo = 'Hybrid (YouTube text + Whisper timing)';
            console.log('Using HYBRID mode');
        } else {
            // WHISPER ONLY: Fallback nếu không có YouTube captions
            mergedWords = whisperWords.map(w => ({
                word: w.word.trim(),
                start: w.start,
                end: w.end,
                source: 'whisper'
            }));
            sourceInfo = 'Whisper only (no YouTube captions)';
            console.log('Using WHISPER ONLY mode');
        }

        console.log('Merged words:', mergedWords.length);

        // ========== STEP 4: GPT chia câu thông minh ==========
        console.log('Step 4: GPT smart segmentation...');
        let segments = await gptSmartSegmentation(mergedWords);

        // ========== STEP 5: Filter intro/outro ==========
        console.log('Step 5: Filtering...');
        segments = filterAndMergeSegments(segments);

        const srt = convertToSRT(segments);
        const itemCount = segments.length;

        return res.status(200).json({
            success: true,
            srt: srt,
            segments: segments,
            itemCount: itemCount,
            videoDuration: videoDuration,
            videoTitle: videoTitle,
            sourceInfo: sourceInfo,
            hasYouTubeCaptions: hasYouTubeCaptions,
            message: `Karaoke V3 (${hasYouTubeCaptions ? 'Hybrid' : 'Whisper'}): ${itemCount} câu`
        });

    } catch (error) {
        console.error('Whisper v5 error:', error);

        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) { }
        }

        return res.status(500).json({
            message: 'Lỗi Whisper v5: ' + error.message
        });
    }
}

/**
 * Ưu tiên German language trong transcripts
 */
async function prioritizeGermanLanguage(transcriptInfo) {
    if (!transcriptInfo?.transcript) return transcriptInfo;

    const GERMAN_KEYWORDS = ['german', 'deutsch', 'tiếng đức'];

    try {
        const selected = transcriptInfo.selectedLanguage?.toLowerCase?.() || '';
        if (GERMAN_KEYWORDS.some(kw => selected.includes(kw))) {
            return transcriptInfo;
        }

        const availableLanguages = transcriptInfo.languages || [];
        const germanLang = availableLanguages.find(lang =>
            GERMAN_KEYWORDS.some(kw => lang.toLowerCase().includes(kw))
        );

        if (germanLang) {
            return await transcriptInfo.selectLanguage(germanLang);
        }
    } catch (e) {
        console.warn('Could not select German:', e.message);
    }

    return transcriptInfo;
}

/**
 * Extract từng từ từ YouTube segments
 */
function extractWordsFromYouTubeSegments(segments) {
    const words = [];

    for (const seg of segments) {
        const snippet = typeof seg.snippet === 'string'
            ? seg.snippet
            : (seg.snippet?.text || seg.snippet?.toString?.() || '');

        const text = snippet.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text) continue;

        const segStart = seg.start_ms / 1000;
        const segEnd = seg.end_ms / 1000;
        const segWords = text.split(/\s+/).filter(w => w);

        if (segWords.length === 0) continue;

        // Phân phối timing đều cho từng từ trong segment
        const wordDuration = (segEnd - segStart) / segWords.length;

        for (let i = 0; i < segWords.length; i++) {
            words.push({
                word: segWords[i],
                start: segStart + i * wordDuration,
                end: segStart + (i + 1) * wordDuration,
                source: 'youtube'
            });
        }
    }

    return words;
}

/**
 * CORE MERGE LOGIC:
 * Kết hợp text từ YouTube với timing từ Whisper
 */
function mergeYouTubeAndWhisper(youtubeWords, whisperWords) {
    const result = [];
    let whisperIdx = 0;

    for (let i = 0; i < youtubeWords.length; i++) {
        const ytWord = youtubeWords[i];
        const cleanYt = normalizeWord(ytWord.word);

        // Tìm từ tương ứng trong Whisper
        let bestMatch = null;
        let bestMatchIdx = -1;
        let bestScore = 0;

        // Tìm trong phạm vi +-10 từ từ vị trí hiện tại
        const searchStart = Math.max(0, whisperIdx - 5);
        const searchEnd = Math.min(whisperWords.length, whisperIdx + 15);

        for (let j = searchStart; j < searchEnd; j++) {
            const whisperWord = whisperWords[j];
            const cleanWhisper = normalizeWord(whisperWord.word);

            if (wordsMatch(cleanYt, cleanWhisper)) {
                // Ưu tiên từ gần vị trí hiện tại
                const distancePenalty = Math.abs(j - whisperIdx) * 0.1;
                const score = 1 - distancePenalty;

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = whisperWord;
                    bestMatchIdx = j;
                }
            }
        }

        if (bestMatch) {
            // Dùng text từ YouTube + timing từ Whisper
            result.push({
                word: ytWord.word,  // Text từ YouTube (chính xác hơn)
                start: bestMatch.start,  // Timing từ Whisper
                end: bestMatch.end,
                source: 'hybrid'
            });
            whisperIdx = bestMatchIdx + 1;
        } else {
            // Không tìm thấy match → ước tính timing
            const lastWord = result[result.length - 1];
            const estimatedStart = lastWord ? lastWord.end : ytWord.start;
            const estimatedEnd = estimatedStart + 0.25;

            result.push({
                word: ytWord.word,
                start: estimatedStart,
                end: estimatedEnd,
                source: 'youtube-estimated'
            });
        }
    }

    return result;
}

/**
 * GPT thêm dấu câu VÀ chia câu thông minh
 * Trả về array các segments đã được chia
 */
async function gptSmartSegmentation(words) {
    try {
        const rawText = words.map(w => w.word).join(' ');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Du bist ein deutscher Linguist für Karaoke-Untertitel.

AUFGABE: Füge Satzzeichen hinzu UND teile den Text in natürliche Segmente.

WICHTIGE REGELN:

1. SEGMENTLÄNGE:
   - MINIMUM: 6 Wörter pro Segment
   - IDEAL: 7-10 Wörter pro Segment
   - MAXIMUM: 14 Wörter pro Segment
   - NIEMALS unter 6 Wörter!

2. NATÜRLICHE TRENNPUNKTE:
   - Trenne BEI Satzenden (. ? !)
   - Trenne bei langen Sätzen AM KOMMA, aber NUR wenn beide Teile ≥6 Wörter
   - Trenne NIEMALS mitten in einem Satzteil

3. NIEMALS TRENNEN:
   - Zwischen Artikel und Nomen: "das Mädchen"
   - Zwischen Präposition und Objekt: "auf das Bett"
   - Zwischen Verb und Ergänzung: "konnte herausfinden"
   - Relativsätze nicht vom Hauptwort trennen

4. BEISPIELE:
   ❌ FALSCH: ["...Matratzen und Kissen, auf das", "das Mädchen klettert?"]
   ✅ RICHTIG: ["...Matratzen und Kissen, auf das das Mädchen klettert?"]
   
   ❌ FALSCH: ["Draußen stand ein Mädchen."]  (nur 4 Wörter!)
   ✅ RICHTIG: Merge mit vorherigem oder nächstem Segment

5. SATZZEICHEN:
   - Punkte, Fragezeichen, Ausrufezeichen, Kommas hinzufügen
   - Groß-/Kleinschreibung korrigieren
   - Deutsche Anführungszeichen: „..."

6. TEXT NICHT ÄNDERN:
   - Keine Wörter hinzufügen oder entfernen
   - Nur Satzzeichen und Großschreibung

Antworte NUR mit einem JSON Array von Strings. Jeder String ist ein Segment.
Beispiel: ["Segment eins.", "Segment zwei, das länger ist.", "Segment drei?"]`
                },
                { role: 'user', content: rawText }
            ],
            temperature: 0.05,
            max_tokens: 4096,
        });

        let content = response.choices[0].message.content.trim();

        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Parse JSON
        let segments = JSON.parse(content);

        if (!Array.isArray(segments) || segments.length === 0) {
            throw new Error('GPT returned invalid format');
        }

        // Post-process: merge short segments
        segments = mergeShortGptSegments(segments);

        // Map timestamps to segments
        return mapTimestampsToGptSegments(words, segments);
    } catch (error) {
        console.error('GPT segmentation error:', error);
        // Fallback: use old punctuation-only approach
        return fallbackSegmentation(words);
    }
}

/**
 * Merge các segment ngắn từ GPT
 */
function mergeShortGptSegments(segments) {
    if (segments.length < 2) return segments;

    const result = [];

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const wordCount = seg.split(/\s+/).filter(w => w).length;

        if (wordCount < MIN_WORDS_PER_SEGMENT && result.length > 0) {
            // Merge với segment trước
            const prev = result[result.length - 1];
            const prevWordCount = prev.split(/\s+/).length;

            if (prevWordCount + wordCount <= MAX_WORDS_PER_SEGMENT) {
                // Không viết hoa từ đầu nếu không phải đầu câu
                const prevEndsWithSentence = SENTENCE_END_PATTERN.test(prev.trim());
                if (prevEndsWithSentence) {
                    result[result.length - 1] = prev + ' ' + seg;
                } else {
                    result[result.length - 1] = prev + ' ' + seg.charAt(0).toLowerCase() + seg.slice(1);
                }
                continue;
            }
        }

        result.push(seg);
    }

    return result;
}

/**
 * Map timestamps từ words vào GPT segments
 */
function mapTimestampsToGptSegments(words, gptSegments) {
    const results = [];
    let wordIdx = 0;

    for (let segIdx = 0; segIdx < gptSegments.length; segIdx++) {
        const segmentText = gptSegments[segIdx];
        const segmentWords = segmentText.split(/\s+/).filter(w => w);

        const wordTimings = [];
        let segmentStart = null;
        let segmentEnd = null;

        for (const gptWord of segmentWords) {
            const normalizedGpt = normalizeWord(gptWord);

            // Tìm từ matching trong words
            let matched = false;
            const searchLimit = Math.min(wordIdx + 15, words.length);

            for (let i = wordIdx; i < searchLimit; i++) {
                const origWord = words[i];
                const normalizedOrig = normalizeWord(origWord.word);

                if (wordsMatch(normalizedGpt, normalizedOrig)) {
                    wordTimings.push({
                        word: gptWord,
                        start: origWord.start,
                        end: origWord.end
                    });

                    if (segmentStart === null) {
                        segmentStart = origWord.start;
                    }
                    segmentEnd = origWord.end;

                    wordIdx = i + 1;
                    matched = true;
                    break;
                }
            }

            // Nếu không match, ước tính
            if (!matched) {
                const lastTiming = wordTimings[wordTimings.length - 1];
                const estimatedStart = lastTiming ? lastTiming.end : (segmentStart || 0);
                const estimatedEnd = estimatedStart + 0.25;

                wordTimings.push({
                    word: gptWord,
                    start: estimatedStart,
                    end: estimatedEnd
                });

                if (segmentStart === null) segmentStart = estimatedStart;
                segmentEnd = estimatedEnd;
            }
        }

        results.push({
            index: segIdx,
            text: segmentText,
            start: segmentStart || 0,
            end: segmentEnd || 0,
            wordTimings: wordTimings
        });
    }

    return results;
}

/**
 * Fallback nếu GPT segmentation lỗi
 */
function fallbackSegmentation(words) {
    const segments = [];
    let current = { words: [], start: 0, end: 0 };

    for (const word of words) {
        if (current.words.length === 0) {
            current.start = word.start;
        }
        current.words.push(word);
        current.end = word.end;

        // Cắt mỗi 8 từ hoặc khi có dấu câu
        const lastWord = current.words[current.words.length - 1].word;
        if (current.words.length >= 8 || SENTENCE_END_PATTERN.test(lastWord)) {
            const text = current.words.map(w => w.word).join(' ');
            segments.push({
                index: segments.length,
                text: text.charAt(0).toUpperCase() + text.slice(1),
                start: current.start,
                end: current.end,
                wordTimings: current.words.map(w => ({ word: w.word, start: w.start, end: w.end }))
            });
            current = { words: [], start: 0, end: 0 };
        }
    }

    if (current.words.length > 0) {
        const text = current.words.map(w => w.word).join(' ');
        segments.push({
            index: segments.length,
            text: text.charAt(0).toUpperCase() + text.slice(1),
            start: current.start,
            end: current.end,
            wordTimings: current.words.map(w => ({ word: w.word, start: w.start, end: w.end }))
        });
    }

    return segments;
}

function mapPunctuationToWords(originalWords, punctuatedText) {
    const punctuatedTokens = punctuatedText.split(/\s+/).filter(t => t);
    const result = [];
    let punctIdx = 0;

    for (let i = 0; i < originalWords.length; i++) {
        const origWord = originalWords[i];
        const cleanOrig = normalizeWord(origWord.word);
        let mappedWord = origWord.word;

        if (punctIdx < punctuatedTokens.length) {
            const punctWord = punctuatedTokens[punctIdx];
            const cleanPunct = normalizeWord(punctWord);

            if (wordsMatch(cleanOrig, cleanPunct)) {
                mappedWord = punctWord;
                punctIdx++;
            } else {
                for (let j = punctIdx; j < Math.min(punctIdx + 5, punctuatedTokens.length); j++) {
                    if (wordsMatch(cleanOrig, normalizeWord(punctuatedTokens[j]))) {
                        mappedWord = punctuatedTokens[j];
                        punctIdx = j + 1;
                        break;
                    }
                }
            }
        }

        result.push({
            ...origWord,
            word: mappedWord,
            hasSentenceEnd: SENTENCE_END_PATTERN.test(mappedWord),
            hasClauseEnd: CLAUSE_END_PATTERN.test(mappedWord)
        });
    }

    return result;
}

function smartSegmentByTiming(words) {
    const segments = [];
    let currentSegment = { words: [], start: 0, end: 0, endsWithSentence: false };

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const nextWord = words[i + 1];

        if (currentSegment.words.length === 0) {
            currentSegment.start = word.start;
        }
        currentSegment.words.push(word);
        currentSegment.end = word.end;

        const wordCount = currentSegment.words.length;
        const isLastWord = i === words.length - 1;
        const gapToNext = nextWord ? (nextWord.start - word.end) * 1000 : 0;
        const hasLargeGap = gapToNext > GAP_THRESHOLD_MS;

        // Cập nhật trạng thái kết thúc câu
        if (word.hasSentenceEnd) {
            currentSegment.endsWithSentence = true;
        }

        let shouldEndSegment = false;

        if (isLastWord) {
            shouldEndSegment = true;
        } else if (wordCount >= MAX_WORDS_PER_SEGMENT) {
            // Đã quá dài, phải cắt
            shouldEndSegment = true;
        } else if (word.hasSentenceEnd && wordCount >= MIN_WORDS_PER_SEGMENT) {
            // Có dấu kết thúc câu và đủ dài
            shouldEndSegment = true;
        } else if (hasLargeGap && word.hasSentenceEnd) {
            // Gap lớn + dấu câu = chắc chắn cắt (không cần đủ MIN_WORDS)
            if (wordCount >= 4) {
                shouldEndSegment = true;
            }
        } else if (hasLargeGap && word.hasClauseEnd && wordCount >= MIN_WORDS_PER_SEGMENT) {
            // Gap lớn + dấu phẩy + đủ dài
            shouldEndSegment = true;
        }
        // KHÔNG cắt chỉ dựa vào gap nếu không có dấu câu!

        // Kiểm tra: đừng để segment tiếp theo quá ngắn
        if (shouldEndSegment && !isLastWord) {
            const remainingWords = words.length - i - 1;
            if (remainingWords > 0 && remainingWords < MIN_WORDS_PER_SEGMENT) {
                if (wordCount + remainingWords <= MAX_WORDS_PER_SEGMENT) {
                    shouldEndSegment = false;
                }
            }
        }

        if (shouldEndSegment) {
            const text = currentSegment.words.map(w => w.word).join(' ');
            segments.push({
                ...currentSegment,
                index: segments.length,
                text: text, // KHONG viết hoa ở đây, sẽ xử lý sau
                wordTimings: currentSegment.words.map(w => ({
                    word: w.word,
                    start: w.start,
                    end: w.end
                }))
            });
            currentSegment = { words: [], start: 0, end: 0, endsWithSentence: false };
        }
    }

    return segments;
}

function filterAndMergeSegments(segments) {
    if (segments.length === 0) return segments;

    // Step 1: Filter intro/outro
    let filtered = segments.filter(seg => {
        const text = seg.text.trim();
        for (const pattern of FILTER_PATTERNS) {
            if (pattern.test(text)) return false;
        }
        return true;
    });

    // Step 2: Merge short segments
    const merged = [];
    for (let i = 0; i < filtered.length; i++) {
        const seg = filtered[i];
        const wordCount = seg.wordTimings?.length || seg.text.split(/\s+/).length;

        if (wordCount < MIN_WORDS_PER_SEGMENT && merged.length > 0) {
            const prev = merged[merged.length - 1];
            const prevWordCount = prev.wordTimings?.length || prev.text.split(/\s+/).length;

            if (prevWordCount + wordCount <= MAX_WORDS_PER_SEGMENT) {
                // Merge vào segment trước - KHÔNG viết hoa từ đầu segment merge
                prev.text = prev.text + ' ' + seg.text.charAt(0).toLowerCase() + seg.text.slice(1);
                prev.end = seg.end;
                if (prev.wordTimings && seg.wordTimings) {
                    prev.wordTimings = [...prev.wordTimings, ...seg.wordTimings];
                }
                continue;
            }
        }
        merged.push(seg);
    }

    // Step 3: Fix capitalization - chỉ viết hoa nếu:
    // - Là segment đầu tiên, HOẶC
    // - Segment trước kết thúc bằng . ! ?
    for (let i = 0; i < merged.length; i++) {
        const seg = merged[i];
        let shouldCapitalize = false;

        if (i === 0) {
            // Segment đầu tiên - viết hoa
            shouldCapitalize = true;
        } else {
            // Kiểm tra segment trước có kết thúc bằng . ! ? không
            const prevText = merged[i - 1].text.trim();
            if (SENTENCE_END_PATTERN.test(prevText)) {
                shouldCapitalize = true;
            }
        }

        if (shouldCapitalize) {
            seg.text = seg.text.charAt(0).toUpperCase() + seg.text.slice(1);
        } else {
            // Giữ nguyên chữ thường (hoặc viết hoa nếu là danh từ - GPT đã xử lý)
            // Không thay đổi gì
        }
    }

    return merged.map((seg, idx) => ({ ...seg, index: idx }));
}

function normalizeWord(word) {
    return word.toLowerCase()
        .replace(/[.,!?;:„"''""»«›‹—–\-\(\)\[\]]/g, '')
        .replace(/ß/g, 'ss')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .trim();
}

function wordsMatch(word1, word2) {
    if (word1 === word2) return true;
    if (word1.length >= 3 && word2.length >= 3) {
        if (word1.includes(word2) || word2.includes(word1)) return true;
    }
    const maxDist = Math.max(1, Math.floor(Math.max(word1.length, word2.length) * 0.3));
    return levenshtein(word1, word2) <= maxDist;
}

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

function convertToSRT(segments) {
    const formatTime = (seconds) => {
        const pad = (n, z = 2) => ("00" + n).slice(-z);
        const ms = Math.round((seconds % 1) * 1000);
        const totalSec = Math.floor(seconds);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
    };

    return segments.map((seg, idx) => {
        return `${idx + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.text}`;
    }).join('\n\n');
}
