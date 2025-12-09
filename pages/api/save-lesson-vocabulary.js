import { promises as fs } from 'fs';
import path from 'path';
import { requireAuth } from '../../lib/authMiddleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Check admin
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  const { lessonId, vocabData } = req.body;

  if (!lessonId || !vocabData) {
    return res.status(400).json({ success: false, message: 'lessonId and vocabData are required' });
  }

  try {
    const vocabPath = path.join(process.cwd(), 'public', 'text', `${lessonId}.vocab.json`);
    
    // Update metadata
    const dataToSave = {
      ...vocabData,
      lessonId,
      updatedAt: new Date().toISOString(),
      totalWords: vocabData.vocabulary?.length || 0
    };

    await fs.writeFile(vocabPath, JSON.stringify(dataToSave, null, 2), 'utf-8');

    return res.status(200).json({
      success: true,
      message: 'Vocabulary saved successfully',
      data: dataToSave
    });

  } catch (error) {
    console.error('Save vocabulary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save vocabulary',
      error: error.message
    });
  }
}

export default requireAuth(handler);
