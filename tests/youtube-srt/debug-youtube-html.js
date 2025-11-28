/**
 * Debug script để kiểm tra YouTube HTML structure
 */

async function debugYouTubeHTML(videoId) {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Fetching: ${watchUrl}\n`);

    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = await response.text();
    console.log(`HTML length: ${html.length} chars\n`);

    // Try different patterns
    const patterns = [
      { name: 'Pattern 1: ytInitialPlayerResponse\\s*=\\s*(\\{.+?\\});<\\/script>', regex: /ytInitialPlayerResponse\s*=\s*(\{.+?\});<\/script>/ },
      { name: 'Pattern 2: ytInitialPlayerResponse\\s*=\\s*(\\{[^;]+)', regex: /ytInitialPlayerResponse\s*=\s*(\{[^;]+)/ },
      { name: 'Pattern 3: var ytInitialPlayerResponse = \\{', regex: /var ytInitialPlayerResponse = \{/ },
      { name: 'Pattern 4: ytInitialPlayerResponse (any)', regex: /ytInitialPlayerResponse/ }
    ];

    console.log('Testing patterns:\n');
    for (const pattern of patterns) {
      const match = html.match(pattern.regex);
      console.log(`${pattern.name}`);
      console.log(`  Found: ${match ? '✅ YES' : '❌ NO'}`);
      if (match) {
        console.log(`  Match length: ${match[0].length} chars`);
        if (match[1]) {
          console.log(`  Capture group: ${match[1].substring(0, 100)}...`);
        }
      }
      console.log('');
    }

    // Search for ytInitialPlayerResponse in the HTML
    const searchTerm = 'ytInitialPlayerResponse';
    const indices = [];
    let idx = html.indexOf(searchTerm);
    while (idx !== -1 && indices.length < 5) {
      indices.push(idx);
      idx = html.indexOf(searchTerm, idx + 1);
    }

    console.log(`\nFound "${searchTerm}" at ${indices.length} location(s):\n`);
    indices.forEach((pos, i) => {
      const start = Math.max(0, pos - 50);
      const end = Math.min(html.length, pos + 150);
      const snippet = html.substring(start, end);
      console.log(`Location ${i + 1} (position ${pos}):`);
      console.log(`  "${snippet.replace(/\n/g, '\\n')}"`);
      console.log('');
    });

    // Look for alternative data sources
    console.log('\nLooking for alternative data sources:\n');

    const altPatterns = [
      'window["ytInitialPlayerResponse"]',
      'window.ytInitialPlayerResponse',
      'var ytInitialData',
      'captions',
      'captionTracks',
      'playerCaptionsTracklistRenderer'
    ];

    altPatterns.forEach(term => {
      const found = html.includes(term);
      console.log(`  ${term}: ${found ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

const videoId = process.argv[2] || 'dQw4w9WgXcQ';
debugYouTubeHTML(videoId);
