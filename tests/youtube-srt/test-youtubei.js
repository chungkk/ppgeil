/**
 * Test youtubei.js library
 */

import { Innertube } from 'youtubei.js';

async function testYoutubeI() {
  console.log('Testing youtubei.js library\n');
  console.log('='.repeat(60));

  try {
    // Initialize Innertube
    console.log('Initializing YouTube client...');
    const youtube = await Innertube.create();
    console.log('✅ Client initialized\n');

    const videoId = 'dQw4w9WgXcQ';
    console.log(`📹 Getting video info: ${videoId}`);

    const info = await youtube.getInfo(videoId);

    console.log(`✅ Video info loaded`);
    console.log(`   Title: ${info.basic_info.title}`);
    console.log(`   Duration: ${info.basic_info.duration} seconds`);
    console.log(`   Author: ${info.basic_info.author}\n`);

    // Get captions
    console.log('📝 Getting captions...');
    const transcriptData = await info.getTranscript();

    if (!transcriptData) {
      console.log('❌ No transcript available');
      return;
    }

    console.log('✅ Transcript loaded!');
    console.log(`   Content type: ${transcriptData.constructor.name}`);

    // Get transcript segments
    const transcript = transcriptData.transcript;
    if (!transcript) {
      console.log('❌ No transcript data');
      return;
    }

    console.log(`   Segments: ${transcript.content?.body?.initial_segments?.length || 0}`);

    const segments = transcript.content?.body?.initial_segments || [];

    if (segments.length > 0) {
      console.log(`\n   First 5 segments:`);
      segments.slice(0, 5).forEach((seg, i) => {
        const snippet = seg.snippet;
        const startMs = seg.start_ms;
        const endMs = seg.end_ms;
        const startSec = (startMs / 1000).toFixed(2);
        console.log(`     ${i + 1}. [${startSec}s] ${snippet}`);
      });

      // Convert to SRT format
      console.log(`\n   Converting to SRT format...`);
      const srt = convertToSRT(segments);
      const srtLines = srt.split('\n\n').length;
      console.log(`   ✅ SRT created with ${srtLines} items`);

      // Show first 2 SRT blocks
      const firstBlocks = srt.split('\n\n').slice(0, 2).join('\n\n');
      console.log(`\n   First 2 SRT blocks:\n${firstBlocks}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

function convertToSRT(segments) {
  const formatTime = (ms) => {
    const pad = (n, z = 2) => ("00" + n).slice(-z);
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
  };

  return segments.map((seg, index) => {
    const num = index + 1;
    const start = formatTime(seg.start_ms);
    const end = formatTime(seg.end_ms);
    const text = seg.snippet;
    return `${num}\n${start} --> ${end}\n${text}`;
  }).join('\n\n');
}

testYoutubeI().catch(console.error);
