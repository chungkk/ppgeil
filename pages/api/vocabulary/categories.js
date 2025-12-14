import { requireAuth } from '../../../lib/authMiddleware';
import { Vocabulary } from '../../../lib/models/Vocabulary';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const categories = await Vocabulary.distinct('category');
      
      const stats = {};
      for (const category of categories) {
        const count = await Vocabulary.countDocuments({ category });
        stats[category] = count;
      }

      return res.status(200).json({
        categories: categories.sort(),
        stats
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { category } = req.body;

      if (!category || !category.trim()) {
        return res.status(400).json({ message: 'Kategoriename ist erforderlich' });
      }

      const existingCategories = await Vocabulary.distinct('category');
      if (existingCategories.includes(category.trim())) {
        return res.status(400).json({ message: 'Kategorie existiert bereits' });
      }

      return res.status(201).json({ 
        message: 'Kategorie erstellt',
        category: category.trim()
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { oldCategory, newCategory } = req.body;

      if (!oldCategory || !newCategory) {
        return res.status(400).json({ message: 'Alte und neue Kategorie sind erforderlich' });
      }

      const result = await Vocabulary.updateMany(
        { category: oldCategory },
        { $set: { category: newCategory.trim() } }
      );

      return res.status(200).json({ 
        message: 'Kategorie aktualisiert',
        updatedCount: result.modifiedCount
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { category } = req.query;

      if (!category) {
        return res.status(400).json({ message: 'Kategorie ist erforderlich' });
      }

      const result = await Vocabulary.updateMany(
        { category },
        { $set: { category: 'Allgemein' } }
      );

      return res.status(200).json({ 
        message: 'Kategorie gelöscht',
        updatedCount: result.modifiedCount
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAuth(handler);
