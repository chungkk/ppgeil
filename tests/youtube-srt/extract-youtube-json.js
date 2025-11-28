/**
 * Helper function để extract ytInitialPlayerResponse từ YouTube HTML
 * Sử dụng bracket counting thay vì regex vì JSON có thể rất phức tạp
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
  // The JSON object starts at startPos
  if (html[startPos] !== '{') {
    throw new Error('Expected JSON object to start with {');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let i = startPos;

  // Parse until we find the matching closing brace
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
          // Found the end of JSON object
          const jsonStr = html.substring(startPos, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch (e) {
            throw new Error('Failed to parse JSON: ' + e.message);
          }
        }
      }
    }

    i++;
  }

  throw new Error('Could not find end of JSON object');
}

// Test
async function test() {
  const videoId = 'dQw4w9WgXcQ';
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  console.log('Fetching YouTube page...');
  const response = await fetch(watchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await response.text();
  console.log(`✅ Fetched ${html.length} chars\n`);

  console.log('Extracting ytInitialPlayerResponse...');
  const playerResponse = extractYtInitialPlayerResponse(html);

  console.log(`✅ Successfully extracted JSON object`);
  console.log(`   Keys: ${Object.keys(playerResponse).join(', ')}\n`);

  // Check for captions
  const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;
  const captionTracks = captions?.captionTracks;

  if (captionTracks) {
    console.log(`✅ Found ${captionTracks.length} caption track(s):`);
    captionTracks.forEach((track, i) => {
      console.log(`   ${i + 1}. ${track.name?.simpleText || track.name} (${track.languageCode})`);
      console.log(`      baseUrl: ${track.baseUrl?.substring(0, 80)}...`);
    });
  } else {
    console.log('❌ No caption tracks found');
  }
}

test().catch(console.error);
