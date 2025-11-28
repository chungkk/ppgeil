/**
 * Script to generate Open Graph image
 * 
 * This script can be used with tools like Puppeteer to automatically
 * generate an OG image from the HTML template.
 * 
 * To use:
 * 1. Install puppeteer: npm install puppeteer
 * 2. Run: node scripts/generate-og-image.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateOGImage() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport to OG image dimensions
  await page.setViewport({
    width: 1200,
    height: 630,
    deviceScaleFactor: 2 // For high quality
  });
  
  // Load the HTML template
  const htmlPath = path.join(__dirname, '../public/og-image-generator.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  await page.setContent(html);
  
  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');
  
  // Take screenshot
  const outputPath = path.join(__dirname, '../public/og-image.jpg');
  await page.screenshot({
    path: outputPath,
    type: 'jpeg',
    quality: 95,
    clip: {
      x: 0,
      y: 0,
      width: 1200,
      height: 630
    }
  });
  
  await browser.close();
  
  console.log('✅ OG image generated successfully at:', outputPath);
}

// Run if called directly
if (require.main === module) {
  generateOGImage().catch(console.error);
}

module.exports = generateOGImage;
