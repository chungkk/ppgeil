import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API endpoint for voice input transcription using OpenAI Whisper
 * Optimized for short voice clips from dictation/shadowing modes
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse the form data
    // Use /tmp for Vercel compatibility (serverless functions have read-only filesystem except /tmp)
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit for voice clips
    });

    const [fields, files] = await form.parse(req);

    if (!files.audio || !files.audio[0]) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const audioFile = files.audio[0];
    const filePath = audioFile.filepath;

    // Get language from request (default to German)
    const language = fields.language ? fields.language[0] : 'de';

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: language, // de for German, vi for Vietnamese, etc.
      response_format: 'text', // Just get plain text for voice input
      temperature: 0.2, // Lower temperature for more accurate transcription
    });

    // Clean up the uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.error('Failed to delete temp file:', cleanupError);
    }

    res.status(200).json({
      success: true,
      text: transcription.trim(),
    });
  } catch (error) {
    console.error('Whisper transcription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transcribe audio',
      error: error.message
    });
  }
}
