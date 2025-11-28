/**
 * Test youtube-transcript library
 */

import { YoutubeTranscript } from 'youtube-transcript';

async function testLibrary() {
  console.log('Testing youtube-transcript library\n');
  console.log('='.repeat(60));

  const testVideos = [
    { id: 'dQw4w9WgXcQ', name: 'Rick Astley - Never Gonna Give You Up' },
    { id: 'M7FIvfx5J10', name: 'Kurzgesagt video' }
  ];

  for (const video of testVideos) {
    console.log(`\n📹 Video: ${video.name}`);
    console.log(`   ID: ${video.id}`);

    try {
      console.log(`   Fetching transcript...`);
      const transcript = await YoutubeTranscript.fetchTranscript(video.id, {
        lang: 'de',
        country: 'DE'
      });

      console.log(`   ✅ Success!`);
      console.log(`   Total items: ${transcript.length}`);

      if (transcript.length > 0) {
        console.log(`\n   First 3 items:`);
        transcript.slice(0, 3).forEach((item, i) => {
          const startSec = (item.offset / 1000).toFixed(2);
          console.log(`     ${i + 1}. [${startSec}s] ${item.text}`);
        });
      }

      // Convert to SRT format (sample)
      console.log(`\n   SRT sample (first item):`);
      if (transcript.length > 0) {
        const item = transcript[0];
        const start = formatTime(item.offset);
        const end = formatTime(item.offset + item.duration);
        console.log(`     1`);
        console.log(`     ${start} --> ${end}`);
        console.log(`     ${item.text}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n' + '-'.repeat(60));
  }
}

function formatTime(ms) {
  const pad = (n, z = 2) => ("00" + n).slice(-z);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

testLibrary().catch(console.error);
