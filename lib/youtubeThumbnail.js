import fs from 'fs';
import path from 'path';

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url) {
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

/**
 * Download YouTube thumbnail and save to public/thumbnails
 * Uses mqdefault (320x180) for optimal size/quality balance
 * 
 * @param {string} youtubeUrl - YouTube video URL
 * @param {string} lessonId - Lesson ID for filename
 * @returns {Promise<string|null>} - Local thumbnail path or null if failed
 */
export async function downloadYouTubeThumbnail(youtubeUrl, lessonId) {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    console.error('Could not extract YouTube video ID from:', youtubeUrl);
    return null;
  }

  // Try different thumbnail qualities (mqdefault is 320x180, good for cards)
  const thumbnailQualities = [
    'mqdefault',      // 320x180 - best for card display
    'hqdefault',      // 480x360 - fallback
    'sddefault',      // 640x480 - fallback
    'default',        // 120x90 - last resort
  ];

  const thumbnailDir = path.join(process.cwd(), 'public', 'thumbnails');
  
  // Create directory if not exists
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  for (const quality of thumbnailQualities) {
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    
    try {
      const response = await fetch(thumbnailUrl);
      
      if (!response.ok) {
        continue; // Try next quality
      }

      const buffer = await response.arrayBuffer();
      
      // Check if it's a valid image (YouTube returns a placeholder for missing thumbnails)
      // The placeholder is typically very small (~1KB)
      if (buffer.byteLength < 2000) {
        continue; // Too small, likely placeholder
      }

      const fileName = `${lessonId}_${quality}.jpg`;
      const filePath = path.join(thumbnailDir, fileName);
      
      fs.writeFileSync(filePath, Buffer.from(buffer));
      
      console.log(`Downloaded thumbnail for ${lessonId}: ${quality} (${buffer.byteLength} bytes)`);
      
      return `/thumbnails/${fileName}`;
    } catch (error) {
      console.error(`Failed to download ${quality} thumbnail:`, error.message);
      continue;
    }
  }

  console.error('Failed to download any thumbnail for:', youtubeUrl);
  return null;
}

/**
 * Get YouTube thumbnail URL without downloading
 * Useful for fallback when local thumbnail is not available
 */
export function getYouTubeThumbnailUrl(youtubeUrl, quality = 'mqdefault') {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
