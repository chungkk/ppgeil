/**
 * Whisper YouTube SRT v2
 * - Dùng GPT để thêm dấu câu (KHÔNG thay đổi từ, chỉ thêm dấu câu)
 * - Dùng word-level timestamps từ Whisper
 * - Smart merge dựa trên dấu câu thực sự + word count
 * - MIN_WORDS = 6, MAX_WORDS = 14
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

// Config
const MIN_WORDS = 6;
const MAX_WORDS = 14;
const MAX_CHAR_LENGTH = 150;

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
    
    // Step 2: Add punctuation using GPT (preserve all words)
    const punctuatedWords = await addPunctuationToWords(words, rawText);
    
    // Step 3: Smart merge based on sentence boundaries + word count
    const segments = smartMergeWithPunctuation(punctuatedWords);

    // Convert to SRT
    const srt = convertToSRT(segments);
    const itemCount = segments.length;

    return res.status(200).json({
      success: true,
      srt: srt,
      itemCount: itemCount,
      videoDuration: videoDuration,
      videoTitle: videoTitle,
      message: `Whisper v2: ${itemCount} câu (có dấu câu, ${MIN_WORDS}-${MAX_WORDS} từ/câu)`
    });

  } catch (error) {
    console.error('Whisper v2 error:', error);

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
      message: 'Lỗi Whisper v2: ' + error.message
    });
  }
}

/**
 * Add punctuation to words using GPT
 * Returns words array with punctuation attached to each word
 */
async function addPunctuationToWords(words, rawText) {
  try {
    // Call GPT to add punctuation
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für deutsche Grammatik und Zeichensetzung.

AUFGABE: Füge Satzzeichen zum folgenden Text hinzu.

STRENGE REGELN:
1. Füge NUR Satzzeichen hinzu: . , ! ? ; : - „ " ' 
2. ÄNDERE KEINE Wörter - nicht korrigieren, nicht löschen, nicht hinzufügen
3. BEHALTE die EXAKTE Reihenfolge aller Wörter
4. Jeder Satz sollte VOLLSTÄNDIG und SINNVOLL sein
5. Verwende Großbuchstaben am Satzanfang
6. Bevorzuge längere, vollständige Sätze (6-14 Wörter pro Satz)
7. Trenne nur bei echten Satzenden (. ! ?)

Antworte NUR mit dem Text mit Satzzeichen, ohne Erklärungen.`
        },
        {
          role: 'user',
          content: rawText
        }
      ],
      temperature: 0.2,
      max_tokens: 4096,
    });

    const punctuatedText = response.choices[0].message.content.trim();
    
    // Map punctuation back to words
    return mapPunctuationToWords(words, punctuatedText);
  } catch (error) {
    console.error('GPT punctuation error:', error);
    // Fallback: return original words without punctuation
    return words.map(w => ({
      ...w,
      word: w.word,
      hasSentenceEnd: false
    }));
  }
}

/**
 * Map punctuated text back to original words with timestamps
 * This ensures NO words are lost
 */
function mapPunctuationToWords(originalWords, punctuatedText) {
  const result = [];
  
  // Normalize punctuated text - split into tokens
  const punctuatedTokens = punctuatedText.split(/\s+/).filter(t => t);
  
  let punctIndex = 0;
  
  for (let i = 0; i < originalWords.length; i++) {
    const origWord = originalWords[i];
    const cleanOrigWord = origWord.word.trim().toLowerCase().replace(/[.,!?;:„"'-]/g, '');
    
    // Find matching punctuated word
    let punctuatedWord = origWord.word.trim();
    let hasSentenceEnd = false;
    
    if (punctIndex < punctuatedTokens.length) {
      const punctToken = punctuatedTokens[punctIndex];
      const cleanPunctToken = punctToken.toLowerCase().replace(/[.,!?;:„"'-]/g, '');
      
      // Check if tokens match (ignoring punctuation)
      if (cleanOrigWord === cleanPunctToken || 
          cleanOrigWord.includes(cleanPunctToken) || 
          cleanPunctToken.includes(cleanOrigWord)) {
        punctuatedWord = punctToken;
        hasSentenceEnd = /[.!?]$/.test(punctToken);
        punctIndex++;
      } else {
        // Try to find the word within next few tokens
        for (let j = punctIndex; j < Math.min(punctIndex + 3, punctuatedTokens.length); j++) {
          const searchToken = punctuatedTokens[j];
          const cleanSearchToken = searchToken.toLowerCase().replace(/[.,!?;:„"'-]/g, '');
          if (cleanOrigWord === cleanSearchToken) {
            punctuatedWord = searchToken;
            hasSentenceEnd = /[.!?]$/.test(searchToken);
            punctIndex = j + 1;
            break;
          }
        }
      }
    }
    
    result.push({
      word: punctuatedWord,
      start: origWord.start,
      end: origWord.end,
      hasSentenceEnd: hasSentenceEnd
    });
  }
  
  return result;
}

/**
 * Smart merge words into segments based on:
 * 1. Sentence-ending punctuation (. ! ?)
 * 2. Word count limits (MIN_WORDS - MAX_WORDS)
 * 3. Character length limit
 */
function smartMergeWithPunctuation(words) {
  const segments = [];
  let currentSegment = {
    words: [],
    start: 0,
    end: 0
  };

  const pushSegment = () => {
    if (currentSegment.words.length === 0) return;

    // Build text with proper spacing
    let text = '';
    for (let i = 0; i < currentSegment.words.length; i++) {
      const w = currentSegment.words[i];
      if (i === 0) {
        text = w.word.trim();
      } else {
        // Add space before word unless previous ends with certain punctuation
        const prevWord = currentSegment.words[i - 1].word;
        if (/[„]$/.test(prevWord)) {
          text += w.word.trim();
        } else {
          text += ' ' + w.word.trim();
        }
      }
    }
    
    text = cleanText(text);
    
    if (text) {
      segments.push({
        text: text,
        start: currentSegment.start,
        end: currentSegment.end
      });
    }
    currentSegment = { words: [], start: 0, end: 0 };
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const nextWord = words[i + 1];

    // Start new segment if empty
    if (currentSegment.words.length === 0) {
      currentSegment.start = word.start;
    }

    currentSegment.words.push(word);
    currentSegment.end = word.end;

    const wordCount = currentSegment.words.length;
    const currentText = currentSegment.words.map(w => w.word).join(' ');
    
    // Check conditions to end segment
    const hasSentenceEnd = word.hasSentenceEnd || /[.!?]$/.test(word.word);
    const reachedMaxWords = wordCount >= MAX_WORDS;
    const reachedMaxChars = currentText.length >= MAX_CHAR_LENGTH;
    const hasMinWords = wordCount >= MIN_WORDS;

    // Decide when to push segment
    if (reachedMaxWords || reachedMaxChars) {
      // Force push when max reached
      pushSegment();
    } else if (hasMinWords && hasSentenceEnd) {
      // Push at sentence end if we have enough words
      pushSegment();
    } else if (!nextWord) {
      // Push remaining words at end
      pushSegment();
    }
  }

  return segments;
}

/**
 * Clean text - normalize spaces, capitalize first letter
 */
function cleanText(text) {
  // Remove extra spaces
  text = text.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  
  return text;
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
