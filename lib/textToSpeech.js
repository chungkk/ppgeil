// Text-to-Speech utility using Web Speech API
// Free, no API key needed, built-in browser feature

let currentUtterance = null;

/**
 * Speak text using Web Speech API
 * @param {string} text - Text to speak
 * @param {string} lang - Language code (default: 'de-DE' for German)
 * @param {number} rate - Speech rate (0.1 to 10, default: 0.9)
 * @param {number} pitch - Speech pitch (0 to 2, default: 1)
 */
export const speakText = (text, lang = 'de-DE', rate = 0.9, pitch = 1) => {
  // Check if browser supports speech synthesis
  if (!window.speechSynthesis) {
    console.error('Speech Synthesis not supported in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1;

  // Try to find German voice
  const voices = window.speechSynthesis.getVoices();
  const germanVoice = voices.find(voice => 
    voice.lang.startsWith('de') || voice.lang.startsWith('de-DE')
  );
  
  if (germanVoice) {
    utterance.voice = germanVoice;
  }

  currentUtterance = utterance;

  // Error handling
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
  };

  // Speak
  window.speechSynthesis.speak(utterance);
};

/**
 * Stop current speech
 */
export const stopSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Check if speech is currently playing
 */
export const isSpeaking = () => {
  return window.speechSynthesis && window.speechSynthesis.speaking;
};

/**
 * Get available voices
 */
export const getAvailableVoices = () => {
  if (!window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
};

/**
 * Get German voices only
 */
export const getGermanVoices = () => {
  const voices = getAvailableVoices();
  return voices.filter(voice => 
    voice.lang.startsWith('de') || voice.lang.includes('German')
  );
};

// Load voices when available (Chrome needs this)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    // Voices loaded
  };
}
