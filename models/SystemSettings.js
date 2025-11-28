const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Site Information
  siteName: {
    type: String,
    default: 'PapaGeil - Deutsch Lernen'
  },
  siteDescription: {
    type: String,
    default: 'Lerne Deutsch mit interaktiven Lektionen'
  },
  siteUrl: {
    type: String,
    default: 'https://papageil.com'
  },
  
  // Email Settings
  emailFrom: {
    type: String,
    default: 'noreply@papageil.com'
  },
  emailSupport: {
    type: String,
    default: 'support@papageil.com'
  },
  
  // Features
  enableRegistration: {
    type: Boolean,
    default: true
  },
  enableGoogleTranslate: {
    type: Boolean,
    default: true
  },
  enableDictionary: {
    type: Boolean,
    default: true
  },
  enableLeaderboard: {
    type: Boolean,
    default: true
  },
  
  // Lesson Settings
  defaultLessonsPerPage: {
    type: Number,
    default: 10,
    min: 5,
    max: 100
  },
  enableYouTubeIntegration: {
    type: Boolean,
    default: true
  },
  
  // User Settings
  defaultUserLevel: {
    type: String,
    enum: ['beginner', 'experienced', 'all'],
    default: 'beginner'
  },
  defaultNativeLanguage: {
    type: String,
    default: 'vi'
  },
  
  // Gamification
  pointsPerLesson: {
    type: Number,
    default: 100,
    min: 0
  },
  pointsPerWord: {
    type: Number,
    default: 10,
    min: 0
  },
  enableStreaks: {
    type: Boolean,
    default: true
  },
  
  // API Keys (encrypted)
  googleTranslateApiKey: {
    type: String,
    default: ''
  },
  youtubeApiKey: {
    type: String,
    default: ''
  },
  
  // Maintenance
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'Die Website wird gerade gewartet. Bitte versuchen Sie es später erneut.'
  },
  
  // Analytics
  enableAnalytics: {
    type: Boolean,
    default: true
  },
  googleAnalyticsId: {
    type: String,
    default: ''
  },
  
  // Social Media
  facebookUrl: {
    type: String,
    default: ''
  },
  twitterUrl: {
    type: String,
    default: ''
  },
  instagramUrl: {
    type: String,
    default: ''
  },
  youtubeUrl: {
    type: String,
    default: ''
  },
  tiktokUrl: {
    type: String,
    default: ''
  },
  linkedinUrl: {
    type: String,
    default: ''
  },
  githubUrl: {
    type: String,
    default: ''
  },
  
  // Appearance / Design Settings
  primaryColor: {
    type: String,
    default: '#667eea'
  },
  secondaryColor: {
    type: String,
    default: '#764ba2'
  },
  accentColor: {
    type: String,
    default: '#f59e0b'
  },
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  textColor: {
    type: String,
    default: '#111827'
  },
  logoUrl: {
    type: String,
    default: ''
  },
  faviconUrl: {
    type: String,
    default: ''
  },
  headerBackgroundColor: {
    type: String,
    default: '#ffffff'
  },
  footerBackgroundColor: {
    type: String,
    default: '#1f2937'
  },
  fontFamily: {
    type: String,
    enum: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'SF Pro'],
    default: 'Inter'
  },
  borderRadius: {
    type: String,
    enum: ['none', 'small', 'medium', 'large', 'full'],
    default: 'medium'
  },
  buttonStyle: {
    type: String,
    enum: ['rounded', 'sharp', 'pill'],
    default: 'rounded'
  },
  showLogo: {
    type: Boolean,
    default: true
  },
  showFooter: {
    type: Boolean,
    default: true
  },
  compactMode: {
    type: Boolean,
    default: false
  },
  defaultTheme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light'
  },
  customCSS: {
    type: String,
    default: ''
  },
  customHeaderHTML: {
    type: String,
    default: ''
  },
  customFooterHTML: {
    type: String,
    default: ''
  },
  
  // Updates
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Singleton pattern - only one settings document
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

systemSettingsSchema.statics.updateSettings = async function(updates, userId) {
  let settings = await this.getSettings();
  Object.assign(settings, updates);
  settings.updatedAt = Date.now();
  settings.updatedBy = userId;
  await settings.save();
  return settings;
};

module.exports = mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingsSchema);
