/**
 * Debug caption fetching
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

async function testCaptionFetch() {
  const videoId = 'dQw4w9WgXcQ';
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  console.log('1. Fetching YouTube page...\n');
  const response = await fetch(watchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await response.text();
  const playerResponse = extractYtInitialPlayerResponse(html);

  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  const track = captionTracks[0]; // German track

  console.log(`2. Selected track: ${track.name?.simpleText} (${track.languageCode})\n`);
  console.log(`3. Base URL:\n   ${track.baseUrl}\n`);

  // Try different URL formats
  const urlFormats = [
    { name: 'JSON3', url: track.baseUrl + '&fmt=json3' },
    { name: 'SRV3', url: track.baseUrl + '&fmt=srv3' },
    { name: 'VTT', url: track.baseUrl + '&fmt=vtt' },
    { name: 'Plain', url: track.baseUrl }
  ];

  for (const format of urlFormats) {
    console.log(`\n4. Testing format: ${format.name}`);
    console.log(`   URL: ${format.url.substring(0, 100)}...`);

    try {
      const captionResponse = await fetch(format.url);
      console.log(`   Status: ${captionResponse.status}`);
      console.log(`   Content-Type: ${captionResponse.headers.get('content-type')}`);

      const text = await captionResponse.text();
      console.log(`   Response length: ${text.length} chars`);
      console.log(`   First 200 chars: ${text.substring(0, 200)}`);

      // Try parsing as JSON
      try {
        const json = JSON.parse(text);
        console.log(`   ✅ Valid JSON!`);
        console.log(`   Keys: ${Object.keys(json).join(', ')}`);

        if (json.events) {
          const eventCount = json.events.filter(e => e.segs).length;
          console.log(`   Events with segments: ${eventCount}`);
        }
      } catch (e) {
        console.log(`   ❌ Not valid JSON: ${e.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Fetch error: ${error.message}`);
    }
  }
}

testCaptionFetch().catch(console.error);
