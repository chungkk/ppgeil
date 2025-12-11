import { requireAuth } from '../../lib/authMiddleware';
import { Vocabulary } from '../../lib/models/Vocabulary';

// Helper function to translate text
async function translateText(text, sourceLang = 'vi', targetLang = 'en') {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
      }),
    });

    if (!response.ok) {
      console.error('Translation API failed');
      return text; // Return original text if translation fails
    }

    const data = await response.json();
    return data.translation || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text if translation fails
  }
}

async function handler(req, res) {
  const userId = req.user._id.toString();

  if (req.method === 'GET') {
    try {
      const { lessonId, targetLanguage, word } = req.query;

      const query = { userId: req.user._id };
      if (lessonId) {
        query.lessonId = lessonId;
      }
      
      // Check if single word exists
      if (word) {
        const exists = await Vocabulary.findOne({ 
          userId: req.user._id, 
          word: word.toLowerCase() 
        });
        return res.status(200).json({ exists: !!exists });
      }

      let vocabulary = await Vocabulary.find(query).sort({ createdAt: -1 });

      // If targetLanguage is specified, always translate to that language
      // This handles cases where vocabulary was saved in a different language
      if (targetLanguage) {
        const translationPromises = vocabulary.map(async (vocab) => {
          const vocabObj = vocab.toObject();

          // Translate the main translation field using auto-detection for source
          if (vocabObj.translation) {
            // Use 'auto' to detect source language automatically
            vocabObj.translation = await translateText(vocabObj.translation, 'auto', targetLanguage);
          }

          // Translate example translations if they exist
          if (vocabObj.examples && Array.isArray(vocabObj.examples)) {
            vocabObj.examples = await Promise.all(
              vocabObj.examples.map(async (example) => {
                if (example.translation) {
                  return {
                    ...example,
                    translation: await translateText(example.translation, 'auto', targetLanguage),
                  };
                }
                return example;
              })
            );
          }

          return vocabObj;
        });

        vocabulary = await Promise.all(translationPromises);
      }

      return res.status(200).json(vocabulary);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { word, translation, context, lessonId, phonetics, partOfSpeech, level, definition, examples } = req.body;

      if (!word || !translation) {
        return res.status(400).json({ message: 'Word và translation là bắt buộc' });
      }

      const updateData = {
        translation,
        context: context || '',
        lessonId: lessonId || null,
        updatedAt: new Date()
      };

      // Add optional fields if provided
      if (phonetics) updateData.phonetics = phonetics;
      if (partOfSpeech) updateData.partOfSpeech = partOfSpeech;
      if (level) updateData.level = level;
      if (definition) updateData.definition = definition;
      if (examples) updateData.examples = examples;

      await Vocabulary.findOneAndUpdate(
        { userId: req.user._id, word: word.toLowerCase() },
        updateData,
        { upsert: true, new: true }
      );

      return res.status(201).json({ message: 'Đã lưu từ vựng' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id, word } = req.query;
      
      // Support delete by id or by word
      if (id) {
        await Vocabulary.findOneAndDelete({ _id: id, userId: req.user._id });
      } else if (word) {
        await Vocabulary.findOneAndDelete({ word: word.toLowerCase(), userId: req.user._id });
      } else {
        return res.status(400).json({ message: 'Cần id hoặc word để xóa' });
      }
      
      return res.status(200).json({ message: 'Đã xóa từ vựng' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.body;
      await Vocabulary.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        {
          $inc: { reviewCount: 1 },
          lastReviewed: new Date()
        }
      );
      return res.status(200).json({ message: 'Đã cập nhật review' });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

const vocabularyHandler = requireAuth(handler);
export default vocabularyHandler;
