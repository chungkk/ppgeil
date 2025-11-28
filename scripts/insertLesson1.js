import connectDB from '../lib/mongodb.js';
import { Lesson } from '../lib/models/Lesson.js';

const insertLesson1 = async () => {
  try {
    await connectDB();

    // Check if lesson already exists
    const existing = await Lesson.findOne({ id: 'bai_1' });
    if (existing) {
      console.log('Lesson bai_1 already exists');
      return;
    }

    // Get max order
    const maxOrderLesson = await Lesson.findOne().sort({ order: -1 });
    const nextOrder = maxOrderLesson ? maxOrderLesson.order + 1 : 1;

    const lesson = new Lesson({
      id: 'bai_1',
      title: 'Patient Erde: Zustand kritisch',
      displayTitle: 'Lektion 1: Patient Erde',
      description: 'Thema: Umwelt, Klimawandel (DW)',
      audio: '/audio/bai_1.mp3',
      json: '/text/bai_1.json',
      order: nextOrder
    });

    await lesson.save();
    console.log('Lesson bai_1 inserted successfully');
  } catch (error) {
    console.error('Error inserting lesson:', error);
  } finally {
    mongoose.connection.close();
  }
};

insertLesson1();