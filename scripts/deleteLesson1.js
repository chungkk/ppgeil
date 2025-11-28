import connectDB from '../lib/mongodb.js';
import { Lesson } from '../lib/models/Lesson.js';
import mongoose from 'mongoose';

const deleteLesson1 = async () => {
  try {
    await connectDB();

    // Delete lesson with id 'bai_1'
    const result = await Lesson.deleteOne({ id: 'bai_1' });
    if (result.deletedCount > 0) {
      console.log('Lesson bai_1 deleted successfully');
    } else {
      console.log('Lesson bai_1 not found');
    }
  } catch (error) {
    console.error('Error deleting lesson:', error);
  } finally {
    mongoose.connection.close();
  }
};

deleteLesson1();