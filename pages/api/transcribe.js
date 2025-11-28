import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public/audio'),
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024, // 25MB limit
    });

    const [fields, files] = await form.parse(req);

    let filePath;
    if (fields.url && fields.url[0]) {
      // Fetch from URL
      const url = fields.url[0];
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(400).json({ message: 'Failed to fetch audio from URL' });
      }
      const buffer = await response.arrayBuffer();
      const tempDir = path.join(process.cwd(), 'public/audio');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFileName = `temp_${Date.now()}.mp3`;
      filePath = path.join(tempDir, tempFileName);
      fs.writeFileSync(filePath, Buffer.from(buffer));
    } else {
      if (!files.audio || !files.audio[0]) {
        return res.status(400).json({ message: 'No audio file provided' });
      }
      const audioFile = files.audio[0];
      filePath = audioFile.filepath;
    }

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'de', // German language
      response_format: 'srt', // Get SRT format directly
    });

    // Clean up the uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json({
      srt: transcription,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      message: 'Failed to transcribe audio',
      error: error.message
    });
  }
}