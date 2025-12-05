// German Vocabulary by Topic
import topicData from './german_vocabulary_by_topic.json';

export const topics = topicData.topics;

export const getTopicById = (id) => {
  return topics.find(t => t.id === id);
};

export const getTopicWords = (topicId) => {
  const topic = getTopicById(topicId);
  return topic ? topic.words : [];
};

export const getAllTopics = () => {
  return topics.map(t => ({
    id: t.id,
    name: t.name,
    name_en: t.name_en,
    name_vi: t.name_vi,
    wordCount: t.words.length
  }));
};

export const getTotalWordCount = () => {
  return topics.reduce((sum, t) => sum + t.words.length, 0);
};

// Topic icons mapping
export const topicIcons = {
  family: '👨‍👩‍👧‍👦',
  animals: '🐾',
  body: '🫀',
  business: '💼',
  feelings: '😊',
  character: '🎭',
  adjectives: '📝',
  verbs: '🏃',
  time: '⏰',
  food: '🍽️',
  house: '🏠',
  transport: '🚗',
  clothes: '👕',
  colors: '🎨',
  numbers: '🔢',
  health: '🏥',
  school: '🎓',
  weather: '🌤️',
  daily_routine: '📅',
  shopping: '🛒',
  sports: '⚽',
  technology: '💻',
  nature: '🌿',
  professions: '👷',
  hobbies: '🎯',
  travel: '✈️',
  restaurant: '🍴',
  verben_praeposition: '🔗'
};

export default topics;
