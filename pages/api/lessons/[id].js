import { Lesson } from '../../../lib/models/Lesson';
import connectDB from '../../../lib/mongodb';

export default async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'Lesson ID is required' });
      }
      
      const lesson = await Lesson.findOne({ id });
      
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }
      
      return res.status(200).json(lesson);
    } catch (error) {
      console.error('Get lesson error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
