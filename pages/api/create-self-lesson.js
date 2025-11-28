/**
 * Create Self Lesson API - Pure JavaScript implementation
 * Sử dụng youtubei.js để lấy transcript từ YouTube
 * IMPROVED: Sử dụng cùng logic merge với admin dashboard
 */

import path from 'path';
import fs from 'fs';
import { Innertube } from 'youtubei.js';
import { requireAuth } from '../../lib/authMiddleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { youtubeUrl, punctuationType = 'with' } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ message: 'Thiếu YouTube URL' });
    }

    // Extract video ID from YouTube URL
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ message: 'URL YouTube không hợp lệ' });
    }

    const videoId = videoIdMatch[1];

    // Get transcript using youtubei.js
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);

    // Get transcript with language prioritization
    let transcriptData = await info.getTranscript();

    if (!transcriptData || !transcriptData.transcript) {
      return res.status(404).json({
        message: 'Video này không có phụ đề khả dụng. Vui lòng chọn video có phụ đề tự động (CC) hoặc thủ công.'
      });
    }

    // Prioritize German language transcript
    transcriptData = await prioritizeTranscriptLanguage(transcriptData);

    const segments = transcriptData.transcript.content?.body?.initial_segments || [];

    if (segments.length === 0) {
      return res.status(404).json({
        message: 'Không tìm thấy nội dung phụ đề trong video này.'
      });
    }

    // Convert segments to JSON format with smart merging (same as admin)
    const jsonData = convertToJSON(segments, punctuationType);

    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'Không thể parse transcript.' });
    }

    // Save JSON to file
    const targetDir = path.join(process.cwd(), 'public', 'text');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const timestamp = Date.now();
    const lessonId = `self_${timestamp}`;
    const fileName = `${lessonId}.json`;
    const targetPath = path.join(targetDir, fileName);

    fs.writeFileSync(targetPath, JSON.stringify(jsonData, null, 4), 'utf8');

    // Get video metadata
    const videoDuration = info.basic_info?.duration || 0;
    const videoTitle = info.basic_info?.title || `Self-created Lesson ${timestamp}`;

    // Create lesson data
    const lessonData = {
      id: lessonId,
      title: videoTitle,
      displayTitle: videoTitle,
      description: videoTitle,
      level: 'A1', // Default
      audio: youtubeUrl,
      youtubeUrl: youtubeUrl,
      json: `/text/${fileName}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoDuration: videoDuration,
    };

    return res.status(200).json({
      success: true,
      lesson: lessonData,
      itemCount: jsonData.length,
      message: 'Lesson created successfully from YouTube!'
    });

  } catch (error) {
    console.error('Create self lesson error:', error);

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

    return res.status(500).json({ message: 'Lỗi tạo lesson: ' + error.message });
  }
}

/**
 * Prioritize German language transcript
 */
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
 * Convert YouTube transcript segments to JSON format (same logic as SRT conversion)
 */
function convertToJSON(segments, punctuationType) {
  const MAX_CHAR_LENGTH = 120;
  const MIN_ALPHA_RATIO = 0.45;

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
      const snippet = typeof seg.snippet === 'string'
        ? seg.snippet
        : (seg.snippet?.text || seg.snippet?.toString?.() || '');
      return snippet && isUsefulText(snippet);
    })
    .map(seg => {
      const snippet = typeof seg.snippet === 'string'
        ? seg.snippet
        : (seg.snippet?.text || seg.snippet?.toString?.() || '');
      return {
        text: normalizeText(snippet),
        start: seg.start_ms / 1000, // Convert to seconds
        end: seg.end_ms / 1000
      };
    });

  if (items.length === 0) {
    return [];
  }

  // Merge segments based on punctuation type
  let merged;
  if (punctuationType === 'without') {
    merged = mergeItemsWithoutPunctuation(items, MAX_CHAR_LENGTH);
  } else {
    merged = mergeItemsWithPunctuation(items, MAX_CHAR_LENGTH);
  }

  return merged;
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

export default requireAuth(handler);
