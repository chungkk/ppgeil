import { verifyToken } from '../../lib/jwt';

/**
 * Extract ytInitialPlayerResponse từ YouTube HTML
 * Sử dụng bracket counting để parse JSON object chính xác
 */
function extractYtInitialPlayerResponse(html) {
  // Find the starting position
  const searchTerm = 'var ytInitialPlayerResponse = ';
  const startPos = html.indexOf(searchTerm);

  if (startPos === -1) {
    // Try alternative format
    const altTerm = 'ytInitialPlayerResponse = ';
    const altPos = html.indexOf(altTerm);
    if (altPos === -1) {
      throw new Error('Cannot find ytInitialPlayerResponse in HTML');
    }
    return extractJSONFromPosition(html, altPos + altTerm.length);
  }

  return extractJSONFromPosition(html, startPos + searchTerm.length);
}

function extractJSONFromPosition(html, startPos) {
  if (html[startPos] !== '{') {
    throw new Error('Expected JSON object to start with {');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let i = startPos;

  while (i < html.length) {
    const char = html[i];

    if (escaped) {
      escaped = false;
      i++;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      i++;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      i++;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          const jsonStr = html.substring(startPos, i + 1);
          return JSON.parse(jsonStr);
        }
      }
    }

    i++;
  }

  throw new Error('Could not find end of JSON object');
}

/**
 * Pure JavaScript implementation để lấy YouTube SRT
 * Không cần Python dependency
 */
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

    // Extract video ID
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ message: 'URL YouTube không hợp lệ' });
    }

    const videoId = videoIdMatch[1];

    // Fetch YouTube watch page HTML
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const htmlResponse = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch YouTube page: ${htmlResponse.status}`);
    }

    const html = await htmlResponse.text();

    // Parse ytInitialPlayerResponse from HTML using bracket counting
    let playerResponse;
    try {
      playerResponse = extractYtInitialPlayerResponse(html);
    } catch (parseError) {
      return res.status(404).json({
        message: 'Không tìm thấy phụ đề. Video có thể không có captions hoặc bị giới hạn.'
      });
    }

    // Extract caption tracks
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;
    const captionTracks = captions?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return res.status(404).json({
        message: 'Video này không có phụ đề khả dụng. Vui lòng chọn video có phụ đề tự động (CC) hoặc thủ công.'
      });
    }

    // Prioritize caption selection:
    // 1. German manually created (kind: "asr" = false)
    // 2. German auto-generated (kind: "asr" = true)
    // 3. English or other languages
    let selectedTrack = null;

    // Try German first
    selectedTrack = captionTracks.find(t =>
      t.languageCode?.startsWith('de') && t.kind !== 'asr'
    );

    if (!selectedTrack) {
      selectedTrack = captionTracks.find(t =>
        t.languageCode?.startsWith('de')
      );
    }

    // Fallback to English or first available
    if (!selectedTrack) {
      selectedTrack = captionTracks.find(t =>
        t.languageCode?.startsWith('en')
      );
    }

    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    // Fetch caption data in JSON3 format
    const captionUrl = selectedTrack.baseUrl + '&fmt=json3';
    const captionResponse = await fetch(captionUrl);

    if (!captionResponse.ok) {
      throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
    }

    const captionData = await captionResponse.json();
    const events = (captionData.events || []).filter(e => e.segs && e.segs.length > 0);

    if (events.length === 0) {
      return res.status(404).json({
        message: 'Không tìm thấy nội dung phụ đề'
      });
    }

    // Convert to SRT format
    const srt = convertToSRT(events, punctuationType);
    const itemCount = srt.split('\n\n').filter(block => block.trim()).length;

    // Get video duration in seconds
    const videoDuration = parseInt(playerResponse?.videoDetails?.lengthSeconds || 0);

    return res.status(200).json({
      success: true,
      srt: srt,
      itemCount: itemCount,
      videoDuration: videoDuration,
      message: 'SRT đã được tải thành công từ YouTube!',
      language: selectedTrack.languageCode
    });

  } catch (error) {
    console.error('Get YouTube SRT error:', error);
    return res.status(500).json({
      message: 'Lỗi lấy SRT từ YouTube: ' + error.message
    });
  }
}

/**
 * Convert YouTube JSON3 events to SRT format
 */
function convertToSRT(events, punctuationType) {
  const MAX_CHAR_LENGTH = 120;
  const MIN_ALPHA_RATIO = 0.45;

  // Helper: Format milliseconds to SRT time format
  const toTime = (ms) => {
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

    // Filter out music notes and noise
    if (/^[\[\(].*[\]\)]$/.test(text.trim())) return false;
    if (/[♪♫♬♩]/.test(text)) return false;

    const visibleChars = text.replace(/\s/g, '');
    if (!visibleChars) return false;

    const alphaNumericCount = (visibleChars.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphaNumericCount === 0) return false;

    const ratio = alphaNumericCount / visibleChars.length;
    return ratio >= MIN_ALPHA_RATIO;
  };

  // Extract items with timing
  const items = events.map(e => {
    const text = normalizeText(e.segs.map(s => s.utf8 || '').join(''));
    const startMs = e.tStartMs || 0;
    const durationMs = e.dDurationMs || 0;
    return {
      text,
      start: startMs,
      end: startMs + durationMs
    };
  }).filter(item => isUsefulText(item.text));

  if (items.length === 0) {
    return '';
  }

  // Merge items based on punctuation type
  let merged;
  if (punctuationType === 'without') {
    merged = mergeItemsWithoutPunctuation(items, MAX_CHAR_LENGTH);
  } else {
    merged = mergeItemsWithPunctuation(items, MAX_CHAR_LENGTH);
  }

  // Build SRT string
  return merged.map((entry, index) => {
    const num = index + 1;
    const startTime = toTime(entry.start);
    const endTime = toTime(entry.end);
    return `${num}\n${startTime} --> ${endTime}\n${entry.text}`;
  }).join('\n\n');
}

/**
 * Merge items with punctuation awareness
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
