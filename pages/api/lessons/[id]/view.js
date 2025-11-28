import { Lesson } from '../../../../lib/models/Lesson';
import connectDB from '../../../../lib/mongodb';

export default async function handler(req, res) {
  await connectDB();
  
  if (req.method === 'POST') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'Lesson ID is required' });
      }
      
      const lesson = await Lesson.findOneAndUpdate(
        { id },
        { $inc: { viewCount: 1 } },
        { new: true }
      );
      
      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }
      
      return res.status(200).json({ viewCount: lesson.viewCount });
    } catch (error) {
      console.error('Increment view count error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
