#!/usr/bin/env node

/**
 * Migration script: Download YouTube thumbnails for all existing lessons
 * 
 * Usage:
 *   node scripts/migrate-thumbnails.js
 *   node scripts/migrate-thumbnails.js --dry-run    # Preview without downloading
 *   node scripts/migrate-thumbnails.js --force      # Re-download even if thumbnail exists
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/papageil';

// Lesson schema (simplified for migration)
const LessonSchema = new mongoose.Schema({
  id: String,
  title: String,
  youtubeUrl: String,
  thumbnail: String,
});

const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);

function extractYouTubeVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
    /(?:https?:\/\/)?youtu\.be\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function downloadThumbnail(youtubeUrl, lessonId) {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) return null;

  const thumbnailQualities = ['mqdefault', 'hqdefault', 'sddefault', 'default'];
  const thumbnailDir = path.join(process.cwd(), 'public', 'thumbnails');

  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  for (const quality of thumbnailQualities) {
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

    try {
      const response = await fetch(thumbnailUrl);
      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 2000) continue; // Skip placeholder images

      const fileName = `${lessonId}_${quality}.jpg`;
      const filePath = path.join(thumbnailDir, fileName);

      fs.writeFileSync(filePath, Buffer.from(buffer));
      return `/thumbnails/${fileName}`;
    } catch (error) {
      continue;
    }
  }

  return null;
}

async function migrate() {
  console.log('🚀 Thumbnail Migration Script');
  console.log('=============================');
  if (DRY_RUN) console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  if (FORCE) console.log('⚠️  FORCE MODE - Re-downloading all thumbnails\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find lessons that need thumbnail migration
    const query = FORCE 
      ? { youtubeUrl: { $exists: true, $ne: null, $ne: '' } }
      : { 
          youtubeUrl: { $exists: true, $ne: null, $ne: '' },
          $or: [
            { thumbnail: { $exists: false } },
            { thumbnail: null },
            { thumbnail: '' },
            { thumbnail: { $regex: /^https?:\/\// } } // External URLs
          ]
        };

    const lessons = await Lesson.find(query);
    console.log(`📋 Found ${lessons.length} lessons to process\n`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const lesson of lessons) {
      const lessonId = lesson.id || lesson._id.toString();
      process.stdout.write(`Processing: ${lessonId.substring(0, 30).padEnd(30)} `);

      // Check if local thumbnail already exists
      if (!FORCE && lesson.thumbnail && lesson.thumbnail.startsWith('/thumbnails/')) {
        const localPath = path.join(process.cwd(), 'public', lesson.thumbnail);
        if (fs.existsSync(localPath)) {
          console.log('⏭️  Already has local thumbnail');
          skipped++;
          continue;
        }
      }

      if (DRY_RUN) {
        console.log('🔍 Would download thumbnail');
        success++;
        continue;
      }

      const thumbnailPath = await downloadThumbnail(lesson.youtubeUrl, lessonId);

      if (thumbnailPath) {
        await Lesson.updateOne({ _id: lesson._id }, { thumbnail: thumbnailPath });
        console.log(`✅ Downloaded: ${thumbnailPath}`);
        success++;
      } else {
        console.log('❌ Failed to download');
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n=============================');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Success: ${success}`);
    console.log(`   ❌ Failed:  ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📋 Total:   ${lessons.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Done!');
  }
}

migrate();
