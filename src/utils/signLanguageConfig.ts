/**
 * Sign Language Configuration
 * 
 * Provider-agnostic architecture:
 * - 'local': Free, offline SVG keyword signs (current default)
 * - 'sign-speak': Sign-Speak Pro API ($20/month)
 * - 'signvrse': Signvrse API (pending)
 * - 'custom': Any custom provider
 */

export type SignProvider = 'local' | 'sign-speak' | 'signvrse' | 'custom';

export const SIGN_PROVIDER: SignProvider = 'local';

export const SIGN_PROVIDER_CONFIG: Record<SignProvider, {
  name: string;
  apiUrl: string;
  requiresApiKey: boolean;
  supportsSentences: boolean;
  supportsOffline: boolean;
}> = {
  local: {
    name: 'Local Signs',
    apiUrl: '',
    requiresApiKey: false,
    supportsSentences: false,
    supportsOffline: true,
  },
  'sign-speak': {
    name: 'Sign-Speak',
    apiUrl: 'https://api.sign-speak.com',
    requiresApiKey: true,
    supportsSentences: true,
    supportsOffline: false,
  },
  signvrse: {
    name: 'Signvrse',
    apiUrl: '',
    requiresApiKey: true,
    supportsSentences: true,
    supportsOffline: false,
  },
  custom: {
    name: 'Custom Provider',
    apiUrl: '',
    requiresApiKey: true,
    supportsSentences: true,
    supportsOffline: false,
  },
};

export const SIGN_KEYWORDS = [
  // Classroom basics
  'teacher', 'student', 'learn', 'learning', 'question', 'answer',
  'help', 'listen', 'listening', 'understand', 'class',
  // Actions
  'read', 'reading', 'write', 'writing', 'think', 'thinking',
  'remember', 'practice',
  // Responses
  'yes', 'no', 'please', 'thank you', 'thanks', 'good',
  'correct', 'hello', 'welcome',
] as const;

export type SignKeyword = typeof SIGN_KEYWORDS[number];

/**
 * Feature flags for future expansion
 */
export const SIGN_LANGUAGE_FEATURES = {
  // Current capabilities
  STATIC_IMAGES: true,
  KEYWORD_DETECTION: true,
  
  // Phase 2 features (to be enabled with funding)
  VIDEO_LIBRARY: false,
  ANIMATED_GIFS: false,
  
  // Phase 3 features (vision)
  REALTIME_TRANSLATION: false,
  API_INTEGRATION: false,
  OFFLINE_PACKS: false,
  BLUETOOTH_SYNC: false,
  
  // Analytics
  USAGE_TRACKING: false,
} as const;

/**
 * Configuration for sign display behavior
 */
export const SIGN_DISPLAY_CONFIG = {
  DISPLAY_DURATION: 4000,
  FADE_DURATION: 300,
  COOLDOWN_PERIOD: 4000,
  MAX_RECENT_CONTEXT: 100,
  SENTENCE_BUFFER_SIZE: 200,
} as const;
