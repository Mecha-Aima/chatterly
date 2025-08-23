export interface AudioSynthesisRequest {
  text: string;
  language: string;
  voice?: string;
  speed?: number;
  quality?: 'low' | 'medium' | 'high';
}

export interface AudioSynthesisResponse {
  audioUrl: string;
  duration: number;
  format: string;
  cached: boolean;
  metadata: {
    language: string;
    voice: string;
    speed: number;
    quality: string;
  };
}

export interface AudioTranscriptionRequest {
  audioData: string; // base64 encoded audio
  language: string;
  model?: string;
  options?: {
    punctuate?: boolean;
    diarize?: boolean;
    smart_format?: boolean;
  };
}

export interface AudioTranscriptionResponse {
  transcript: string;
  confidence: number;
  words: WordLevelConfidence[];
  language: string;
  duration: number;
}

export interface WordLevelConfidence {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

export interface AudioCacheEntry {
  id: string;
  text: string;
  language: string;
  audioUrl: string;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
}

export interface PronunciationFeedback {
  overallScore: number;
  wordScores: WordPronunciationScore[];
  suggestions: string[];
  fluency: number;
  accuracy: number;
}

export interface WordPronunciationScore {
  word: string;
  score: number;
  expected: string;
  actual: string;
  confidence: number;
}

export interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string | null;
} 