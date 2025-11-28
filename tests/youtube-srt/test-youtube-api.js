/**
 * Test script cho YouTube SRT API
 * Không cần auth để test core functionality
 */

function extractYtInitialPlayerResponse(html) {
  const searchTerm = 'var ytInitialPlayerResponse = ';
  const startPos = html.indexOf(searchTerm);

  if (startPos === -1) {
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

async function getYouTubeSRT(videoId) {
  try {
    console.log(`\n🔍 Đang lấy SRT cho video: ${videoId}`);

    // Fetch YouTube watch page HTML
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`📥 Fetching: ${watchUrl}`);

    const htmlResponse = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch YouTube page: ${htmlResponse.status}`);
    }

    const html = await htmlResponse.text();
    console.log(`✅ HTML fetched: ${html.length} characters`);

    // Parse ytInitialPlayerResponse from HTML using bracket counting
    console.log('🔍 Parsing ytInitialPlayerResponse...');
    const playerResponse = extractYtInitialPlayerResponse(html);
    console.log('✅ Successfully parsed ytInitialPlayerResponse');

    // Extract caption tracks
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;
    const captionTracks = captions?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('Video không có phụ đề');
    }

    console.log(`✅ Found ${captionTracks.length} caption track(s):`);
    captionTracks.forEach((track, i) => {
      console.log(`   ${i + 1}. ${track.name?.simpleText} (${track.languageCode}) - ${track.kind === 'asr' ? 'Auto-generated' : 'Manual'}`);
    });

    // Select track (prefer German, then English, then first)
    let selectedTrack = captionTracks.find(t =>
      t.languageCode?.startsWith('de') && t.kind !== 'asr'
    );

    if (!selectedTrack) {
      selectedTrack = captionTracks.find(t =>
        t.languageCode?.startsWith('de')
      );
    }

    if (!selectedTrack) {
      selectedTrack = captionTracks.find(t =>
        t.languageCode?.startsWith('en')
      );
    }

    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    console.log(`\n📌 Selected track: ${selectedTrack.name?.simpleText} (${selectedTrack.languageCode})`);

    // Fetch caption data
    const captionUrl = selectedTrack.baseUrl + '&fmt=json3';
    console.log(`📥 Fetching captions...`);

    const captionResponse = await fetch(captionUrl);
    if (!captionResponse.ok) {
      throw new Error(`Failed to fetch captions: ${captionResponse.status}`);
    }

    const captionData = await captionResponse.json();
    const events = (captionData.events || []).filter(e => e.segs && e.segs.length > 0);

    console.log(`✅ Found ${events.length} caption events`);

    if (events.length === 0) {
      throw new Error('Không có dữ liệu phụ đề');
    }

    // Convert first 5 events to show sample
    console.log('\n📝 Sample captions (first 5):');
    events.slice(0, 5).forEach((e, i) => {
      const text = e.segs.map(s => s.utf8 || '').join('');
      const startSec = ((e.tStartMs || 0) / 1000).toFixed(2);
      console.log(`   ${i + 1}. [${startSec}s] ${text}`);
    });

    // Convert to SRT
    const srt = convertToSRT(events, 'with');
    const itemCount = srt.split('\n\n').filter(block => block.trim()).length;

    console.log(`\n✅ SRT conversion successful!`);
    console.log(`   Total items: ${itemCount}`);
    console.log(`   SRT length: ${srt.length} characters`);

    // Show first 2 SRT blocks
    const firstBlocks = srt.split('\n\n').slice(0, 2).join('\n\n');
    console.log(`\n📄 First 2 SRT blocks:\n${firstBlocks}`);

    return {
      success: true,
      srt,
      itemCount,
      language: selectedTrack.languageCode
    };

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert YouTube JSON3 events to SRT format
 */
function convertToSRT(events, punctuationType) {
  const MAX_CHAR_LENGTH = 120;
  const MIN_ALPHA_RATIO = 0.45;

  const toTime = (ms) => {
    const pad = (n, z = 2) => ("00" + n).slice(-z);
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
  };

  const normalizeText = (text) => {
    return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const isUsefulText = (text) => {
    if (!text || !text.trim()) return false;
    if (/^[\[\(].*[\]\)]$/.test(text.trim())) return false;
    if (/[♪♫♬♩]/.test(text)) return false;

    const visibleChars = text.replace(/\s/g, '');
    if (!visibleChars) return false;

    const alphaNumericCount = (visibleChars.match(/[a-zA-Z0-9]/g) || []).length;
    if (alphaNumericCount === 0) return false;

    const ratio = alphaNumericCount / visibleChars.length;
    return ratio >= MIN_ALPHA_RATIO;
  };

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

  const merged = mergeItemsWithPunctuation(items, MAX_CHAR_LENGTH);

  return merged.map((entry, index) => {
    const num = index + 1;
    const startTime = toTime(entry.start);
    const endTime = toTime(entry.end);
    return `${num}\n${startTime} --> ${endTime}\n${entry.text}`;
  }).join('\n\n');
}

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

// Test với các video khác nhau
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       YouTube SRT Extractor Test Suite                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const testVideos = [
    { id: 'dQw4w9WgXcQ', name: 'Rick Astley - Never Gonna Give You Up' },
    { id: 'jNQXAC9IVRw', name: 'Me at the zoo (First YouTube video)' },
    { id: 'M7FIvfx5J10', name: 'Kurzgesagt video (có phụ đề tiếng Đức)' }
  ];

  for (const video of testVideos) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${video.name}`);
    console.log(`Video ID: ${video.id}`);
    console.log('='.repeat(60));

    const result = await getYouTubeSRT(video.id);

    if (result.success) {
      console.log(`\n✅ TEST PASSED for ${video.id}`);
    } else {
      console.log(`\n❌ TEST FAILED for ${video.id}`);
    }

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 All tests completed!');
  console.log('='.repeat(60));
}

// Run tests
runTests();
