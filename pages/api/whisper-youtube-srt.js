/**
 * YouTube SRT via OpenAI Whisper API
 * Tải audio từ YouTube và dùng OpenAI Whisper để transcribe
 * Hữu ích khi video không có caption tự động
 */

import { Innertube } from 'youtubei.js';
import { OpenAI } from 'openai';
import { verifyToken } from '../../lib/jwt';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
  maxDuration: 300, // 5 minutes timeout for long videos
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Download audio from YouTube using yt-dlp
async function downloadYouTubeAudio(videoId, outputPath) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Use yt-dlp to download audio only (webm format - no ffmpeg needed)
  // -f bestaudio: get best audio quality
  // --no-playlist: don't download playlist
  const command = `yt-dlp -f bestaudio --no-playlist -o "${outputPath}" "${url}"`;
  
  try {
    await execAsync(command, { timeout: 180000 }); // 3 min timeout
    return outputPath;
  } catch (error) {
    // yt-dlp may save with different extension, check for common patterns
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
    
    // Also check if file exists with .webm extension added
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

    const { youtubeUrl, maxWords = 12 } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'Thiếu YouTube URL' });
    }

    // Extract video ID
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

    // Check video duration (limit to 25 minutes for Whisper API - 25MB file limit)
    if (videoDuration > 1500) { // 25 minutes
      return res.status(400).json({
        message: `Video quá dài (${Math.floor(videoDuration / 60)} phút). Whisper API chỉ hỗ trợ video tối đa 25 phút.`
      });
    }

    // Download audio to temp file using yt-dlp
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
    
    console.log('Downloaded audio file:', tempFilePath);

    // Check file size (Whisper API limit is 25MB)
    const stats = fs.statSync(tempFilePath);
    if (stats.size > 25 * 1024 * 1024) {
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({
        message: 'File audio quá lớn (>25MB). Vui lòng chọn video ngắn hơn.'
      });
    }

    // Transcribe with OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'de', // German
      response_format: 'verbose_json',
      timestamp_granularities: ['segment', 'word'],
    });

    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      tempFilePath = null;
    }

    // Add punctuation using GPT to create complete sentences
    const punctuatedText = await addPunctuationWithGPT(transcription.text);
    
    // Convert to SRT with sentence-based grouping
    const srt = convertToSentenceBasedSRT(transcription, punctuatedText, maxWords);

    const itemCount = srt.split('\n\n').filter(block => block.trim()).length;

    return res.status(200).json({
      success: true,
      srt: srt,
      itemCount: itemCount,
      videoDuration: videoDuration,
      videoTitle: videoTitle,
      message: `SRT đã được tạo bằng Whisper AI! (${itemCount} segments)`
    });

  } catch (error) {
    console.error('Whisper YouTube SRT error:', error);

    // Clean up temp file on error
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
      message: 'Lỗi tạo SRT bằng Whisper: ' + error.message
    });
  }
}

/**
 * Add punctuation to transcript using GPT
 */
async function addPunctuationWithGPT(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für deutsche Grammatik. Deine Aufgabe ist es, den folgenden Text mit korrekter Zeichensetzung zu versehen (Punkte, Kommas, Fragezeichen, Ausrufezeichen). 

WICHTIGE REGELN:
- Füge NUR Satzzeichen hinzu
- Ändere KEINE Wörter
- Lösche KEINE Wörter  
- Füge KEINE neuen Wörter hinzu
- Behalte die EXAKTE Reihenfolge der Wörter bei
- Jeder Satz sollte sinnvoll und vollständig sein
- Verwende Großbuchstaben am Satzanfang

Antworte NUR mit dem korrigierten Text, ohne Erklärungen.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('GPT punctuation error:', error);
    return text; // Return original if GPT fails
  }
}

/**
 * Convert to SRT with sentence-based grouping
 * Uses punctuated text to determine sentence boundaries
 */
function convertToSentenceBasedSRT(transcription, punctuatedText, maxWords = 12) {
  const formatTime = (seconds) => {
    const pad = (n, z = 2) => ("00" + n).slice(-z);
    const ms = Math.round((seconds % 1) * 1000);
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
  };

  // Get word timestamps from Whisper
  const whisperWords = transcription.words || [];
  if (whisperWords.length === 0) {
    // Fallback to segment-based if no word timestamps
    return convertSegmentsToSRT(transcription.segments || [], maxWords, formatTime);
  }

  // Split punctuated text into sentences
  const sentences = splitIntoSentences(punctuatedText);
  
  // Map sentences to word timestamps
  const srtEntries = mapSentencesToTimestamps(sentences, whisperWords, maxWords);

  // Build SRT string
  return srtEntries.map((entry, index) => {
    const num = index + 1;
    const start = formatTime(entry.start);
    const end = formatTime(entry.end);
    return `${num}\n${start} --> ${end}\n${entry.text}`;
  }).join('\n\n');
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text) {
  // Split by sentence-ending punctuation, keeping the punctuation
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.filter(s => s.trim().length > 0);
}

/**
 * Map sentences to word timestamps
 * If sentence is too long, split it at natural break points
 */
function mapSentencesToTimestamps(sentences, whisperWords, maxWords) {
  const entries = [];
  let wordIndex = 0;

  // Normalize whisper words for matching
  const normalizedWhisperWords = whisperWords.map(w => ({
    ...w,
    normalized: w.word.trim().toLowerCase().replace(/[.,!?;:'"]/g, '')
  }));

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/);
    if (sentenceWords.length === 0) continue;

    // Find matching words in whisper output
    const matchedWords = [];
    let tempIndex = wordIndex;

    for (const word of sentenceWords) {
      const normalizedWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '');
      
      // Look for this word in whisper words (with some flexibility)
      let found = false;
      for (let i = tempIndex; i < Math.min(tempIndex + 10, normalizedWhisperWords.length); i++) {
        if (normalizedWhisperWords[i].normalized === normalizedWord || 
            normalizedWhisperWords[i].normalized.includes(normalizedWord) ||
            normalizedWord.includes(normalizedWhisperWords[i].normalized)) {
          matchedWords.push({
            word: word,
            start: whisperWords[i].start,
            end: whisperWords[i].end
          });
          tempIndex = i + 1;
          found = true;
          break;
        }
      }
      
      // If not found, use interpolation from last known position
      if (!found && matchedWords.length > 0) {
        const lastMatch = matchedWords[matchedWords.length - 1];
        matchedWords.push({
          word: word,
          start: lastMatch.end,
          end: lastMatch.end + 0.3
        });
      }
    }

    if (matchedWords.length === 0) continue;

    wordIndex = tempIndex;

    // If sentence is short enough, add as single entry
    if (sentenceWords.length <= maxWords) {
      entries.push({
        text: sentence.trim(),
        start: matchedWords[0].start,
        end: matchedWords[matchedWords.length - 1].end
      });
    } else {
      // Split long sentence into chunks at natural break points (commas, conjunctions)
      const chunks = splitLongSentence(sentence, matchedWords, maxWords);
      entries.push(...chunks);
    }
  }

  return entries;
}

/**
 * Split a long sentence into smaller chunks at natural break points
 */
function splitLongSentence(sentence, matchedWords, maxWords) {
  const chunks = [];
  const words = sentence.trim().split(/\s+/);
  
  let chunkStart = 0;
  let lastBreakPoint = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordCount = i - chunkStart + 1;
    
    // Check for natural break points (after commas, conjunctions)
    const isBreakPoint = /[,;:]$/.test(word) || 
                         ['und', 'oder', 'aber', 'denn', 'weil', 'dass', 'wenn', 'also'].includes(words[i + 1]?.toLowerCase());
    
    if (isBreakPoint && wordCount >= 4) {
      lastBreakPoint = i;
    }

    // If we've reached max words or end of sentence
    if (wordCount >= maxWords || i === words.length - 1) {
      const breakAt = (wordCount >= maxWords && lastBreakPoint > chunkStart) ? lastBreakPoint : i;
      
      const chunkText = words.slice(chunkStart, breakAt + 1).join(' ');
      const startTime = matchedWords[chunkStart]?.start || (chunks.length > 0 ? chunks[chunks.length - 1].end : 0);
      const endTime = matchedWords[breakAt]?.end || startTime + 2;

      chunks.push({
        text: chunkText,
        start: startTime,
        end: endTime
      });

      chunkStart = breakAt + 1;
      lastBreakPoint = chunkStart;
      
      if (chunkStart >= words.length) break;
    }
  }

  return chunks;
}

/**
 * Convert segment-level timestamps to SRT (fallback)
 */
function convertSegmentsToSRT(segments, maxWords, formatTime) {
  const srtEntries = [];

  for (const segment of segments) {
    const text = segment.text?.trim() || '';
    if (!text) continue;

    const words = text.split(/\s+/);
    const segmentDuration = segment.end - segment.start;
    const wordDuration = segmentDuration / words.length;

    // Split into chunks of maxWords
    for (let i = 0; i < words.length; i += maxWords) {
      const chunkWords = words.slice(i, Math.min(i + maxWords, words.length));
      const chunkStart = segment.start + (i * wordDuration);
      const chunkEnd = segment.start + (Math.min(i + maxWords, words.length) * wordDuration);

      srtEntries.push({
        text: chunkWords.join(' '),
        start: chunkStart,
        end: chunkEnd
      });
    }
  }

  // Build SRT string
  return srtEntries.map((entry, index) => {
    const num = index + 1;
    const start = formatTime(entry.start);
    const end = formatTime(entry.end);
    return `${num}\n${start} --> ${end}\n${entry.text}`;
  }).join('\n\n');
}
