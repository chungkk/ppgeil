/**
 * YouTube SRT API - Pure JavaScript implementation
 * Sử dụng youtubei.js thay vì Python subprocess
 *
 * Ưu điểm:
 * - Không cần Python dependency
 * - Nhanh hơn (không spawn subprocess)
 * - Dễ maintain và deploy
 * - Tương thích hoàn toàn với Next.js
 */

import { Innertube } from 'youtubei.js';
import { verifyToken } from '../../lib/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

    const { youtubeUrl, punctuationType = 'with' } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'Thiếu YouTube URL' });
    }

    if (!['with', 'without'].includes(punctuationType)) {
      return res.status(400).json({ message: 'Loại SRT không hợp lệ. Sử dụng "with" hoặc "without"' });
    }

    // Extract video ID from YouTube URL
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ message: 'URL YouTube không hợp lệ' });
    }

    const videoId = videoIdMatch[1];

    // Initialize YouTube client
    const youtube = await Innertube.create();

    // Get video info
    const info = await youtube.getInfo(videoId);

    // Get transcript
    let transcriptData = await info.getTranscript();

    if (!transcriptData || !transcriptData.transcript) {
      return res.status(404).json({
        message: 'Video này không có phụ đề khả dụng. Vui lòng chọn video có phụ đề tự động (CC) hoặc thủ công.'
      });
    }

    transcriptData = await prioritizeTranscriptLanguage(transcriptData);

    const segments = transcriptData.transcript.content?.body?.initial_segments || [];

    if (segments.length === 0) {
      return res.status(404).json({
        message: 'Không tìm thấy nội dung phụ đề trong video này.'
      });
    }

    // Convert to SRT format
    const srt = convertToSRT(segments, punctuationType);

    if (!srt) {
      return res.status(500).json({
        message: 'Không thể chuyển đổi phụ đề sang format SRT'
      });
    }

    const itemCount = srt.split('\n\n').filter(block => block.trim()).length;

    // Get video duration in seconds
    const videoDuration = info.basic_info?.duration || 0;

    // Get video title
    const videoTitle = info.basic_info?.title || '';

    return res.status(200).json({
      success: true,
      srt: srt,
      itemCount: itemCount,
      videoDuration: videoDuration,
      videoTitle: videoTitle,
      message: 'SRT đã được tải thành công từ YouTube!'
    });

  } catch (error) {
    console.error('Get YouTube SRT error:', error);

    // Handle specific errors
    if (error.message?.includes('This video is unavailable')) {
      return res.status(404).json({
        message: 'Video không khả dụng hoặc đã bị xóa'
      });
    }

    if (error.message?.includes('No transcripts')) {
      return res.status(404).json({
        message: 'Video này không có phụ đề khả dụng'
      });
    }

    return res.status(500).json({
      message: 'Lỗi lấy SRT từ YouTube: ' + error.message
    });
  }
}

async function prioritizeTranscriptLanguage(transcriptInfo) {
  if (!transcriptInfo?.transcript) {
    return transcriptInfo;
  }

  const GERMAN_KEYWORDS = ['german', 'deutsch', 'tiếng đức'];

  try {
    const selected = transcriptInfo.selectedLanguage?.toLowerCase?.() || '';
    if (GERMAN_KEYWORDS.some(keyword => selected.includes(keyword))) {
      return transcriptInfo;
    }

    const availableLanguages = transcriptInfo.languages || [];
    const germanLanguage = availableLanguages.find(lang =>
      GERMAN_KEYWORDS.some(keyword => lang.toLowerCase().includes(keyword))
    );

    if (germanLanguage) {
      return await transcriptInfo.selectLanguage(germanLanguage);
    }
  } catch (error) {
    console.warn('Không thể chọn transcript tiếng Đức ưu tiên:', error.message);
    return transcriptInfo;
  }

  return transcriptInfo;
}

/**
 * Convert YouTube transcript segments to SRT format
 *
 * @param {Array} segments - Transcript segments from YouTube
 * @param {string} punctuationType - 'with' or 'without' punctuation
 * @returns {string} SRT formatted string
 */
function convertToSRT(segments, punctuationType) {
  const MAX_CHAR_LENGTH = 120;
  const MIN_ALPHA_RATIO = 0.45;

  // Helper: Format milliseconds to SRT time
  const formatTime = (ms) => {
    const pad = (n, z = 2) => ("00" + n).slice(-z);
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
  };

  // Helper: Normalize text
  const normalizeText = (text) => {
    return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Helper: Check if text is useful
  const isUsefulText = (text) => {
    if (!text || !text.trim()) return false;

    // Filter music notes and noise
    if (/^[\[\(].*[\]\)]$/.test(text.trim())) return false;
    if (/^[♪♫♬♩\s]+$/.test(text)) return false;

    const visibleChars = text.replace(/\s/g, '');
    if (!visibleChars) return false;

    const alphaNumericCount = (visibleChars.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphaNumericCount === 0) return false;

    const ratio = alphaNumericCount / visibleChars.length;
    return ratio >= MIN_ALPHA_RATIO;
  };

  // Filter and normalize segments
  const items = segments
    .filter(seg => {
      // snippet is an object with .text property or .toString() method
      const snippet = typeof seg.snippet === 'string'
        ? seg.snippet
        : (seg.snippet?.text || seg.snippet?.toString?.() || '');
      return snippet && isUsefulText(snippet);
    })
    .map(seg => {
      // Normalize snippet to string
      const snippet = typeof seg.snippet === 'string'
        ? seg.snippet
        : (seg.snippet?.text || seg.snippet?.toString?.() || '');
      return {
        text: normalizeText(snippet),
        start: seg.start_ms,
        end: seg.end_ms
      };
    });

  if (items.length === 0) {
    return '';
  }

  // Merge segments based on punctuation type
  let merged;
  if (punctuationType === 'without') {
    merged = mergeItemsWithoutPunctuation(items, MAX_CHAR_LENGTH);
  } else {
    merged = mergeItemsWithPunctuation(items, MAX_CHAR_LENGTH);
  }

  // Build SRT string
  return merged.map((entry, index) => {
    const num = index + 1;
    const start = formatTime(entry.start);
    const end = formatTime(entry.end);
    return `${num}\n${start} --> ${end}\n${entry.text}`;
  }).join('\n\n');
}

/**
 * Merge items with punctuation awareness (sentence-based)
 */
function mergeItemsWithPunctuation(items, maxCharLength) {
  const MIN_WORDS = 6;
  const MAX_WORDS = 16;
  const sentenceEndPattern = /[.!?…]+["'\)\]]*\s*$/;

  const merged = [];
  let currentGroup = [];
  let currentTexts = [];

  const pushCurrentGroup = (nextStart = null) => {
    if (currentGroup.length === 0) return;

    const text = currentTexts.join(' ');
    const start = currentGroup[0].start;
    let end = currentGroup[currentGroup.length - 1].end;

    if (nextStart !== null) {
      end = Math.min(end, nextStart);
    }

    if (text && (text.length <= maxCharLength || currentGroup.length === 1)) {
      merged.push({ text, start, end });
    }

    currentGroup = [];
    currentTexts = [];
  };

  items.forEach((item, idx) => {
    if (currentGroup.length > 0) {
      const potentialText = [...currentTexts, item.text].join(' ');
      const wordCount = potentialText.split(/\s+/).length;

      if (potentialText.length > maxCharLength || wordCount > MAX_WORDS) {
        const nextStart = item.start;
        pushCurrentGroup(nextStart);
      }
    }

    currentGroup.push(item);
    currentTexts.push(item.text);

    const combinedText = currentTexts.join(' ');
    const wordCount = combinedText.split(/\s+/).length;
    const hasSentenceEnd = sentenceEndPattern.test(item.text);

    if ((hasSentenceEnd && wordCount >= MIN_WORDS) || wordCount >= MAX_WORDS) {
      const nextStart = idx + 1 < items.length ? items[idx + 1].start : null;
      pushCurrentGroup(nextStart);
    }
  });

  pushCurrentGroup();
  return merged;
}

/**
 * Merge items without punctuation (word count based)
 */
function mergeItemsWithoutPunctuation(items, maxCharLength) {
  const MAX_WORDS = 12;

  const merged = [];
  let currentGroup = [];
  let currentTexts = [];

  const pushCurrentGroup = (nextStart = null) => {
    if (currentGroup.length === 0) return;

    const text = currentTexts.join(' ');
    const start = currentGroup[0].start;
    let end = currentGroup[currentGroup.length - 1].end;

    if (nextStart !== null) {
      end = Math.min(end, nextStart);
    }

    if (text && (text.length <= maxCharLength || currentGroup.length === 1)) {
      merged.push({ text, start, end });
    }

    currentGroup = [];
    currentTexts = [];
  };

  items.forEach((item, idx) => {
    if (currentGroup.length > 0) {
      const potentialText = [...currentTexts, item.text].join(' ');
      const wordCount = potentialText.split(/\s+/).length;

      if (potentialText.length > maxCharLength || wordCount > MAX_WORDS) {
        const nextStart = item.start;
        pushCurrentGroup(nextStart);
      }
    }

    currentGroup.push(item);
    currentTexts.push(item.text);

    const combinedText = currentTexts.join(' ');
    const wordCount = combinedText.split(/\s+/).length;

    if (wordCount >= MAX_WORDS) {
      const nextStart = idx + 1 < items.length ? items[idx + 1].start : null;
      pushCurrentGroup(nextStart);
    }
  });

  pushCurrentGroup();
  return merged;
}
