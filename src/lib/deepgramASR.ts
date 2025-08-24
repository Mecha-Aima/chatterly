import { AudioTranscriptionRequest, AudioTranscriptionResponse, WordLevelConfidence } from '@/types/audio.types';

class DeepgramASRManager {
  private readonly API_BASE_URL = 'https://api.deepgram.com/v1/listen';
  private readonly DEFAULT_MODEL = 'nova-2';
  private readonly SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

  /**
   * Transcribe audio using Deepgram ASR API
   */
  async transcribeAudio(request: AudioTranscriptionRequest): Promise<AudioTranscriptionResponse> {
    try {
      // Validate language support
      if (!this.SUPPORTED_LANGUAGES.includes(request.language)) {
        throw new Error(`Language ${request.language} is not supported by Deepgram`);
      }

      // Prepare request options
      const options = {
        model: request.model || this.DEFAULT_MODEL,
        language: request.language,
        punctuate: request.options?.punctuate ?? true,
        diarize: request.options?.diarize ?? false,
        smart_format: request.options?.smart_format ?? true,
        word_confidence: true,
        utterance_end_ms: 1000,
        interim_results: false
      };

      // Call Deepgram API
      const response = await this.callDeepgramAPI(request.audioData, options);
      
      // Process and format response
      return this.processTranscriptionResponse(response, request.language);
    } catch (error) {
      console.error('Deepgram ASR error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Call Deepgram API with audio data
   */
  private async callDeepgramAPI(audioData: string, options: any): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.API_BASE_URL}?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: Buffer.from(audioData, 'base64'),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Process Deepgram API response into standardized format
   */
  private processTranscriptionResponse(response: any, language: string): AudioTranscriptionResponse {
    const results = response.results;
    if (!results || results.length === 0) {
      throw new Error('No transcription results received');
    }

    const result = results[0];
    const transcript = result.channels[0].alternatives[0].transcript;
    const confidence = result.channels[0].alternatives[0].confidence;
    
    // Extract word-level confidence data
    const words: WordLevelConfidence[] = [];
    if (result.channels[0].alternatives[0].words) {
      result.channels[0].alternatives[0].words.forEach((word: any) => {
        words.push({
          word: word.word,
          start: word.start,
          end: word.end,
          confidence: word.confidence,
          speaker: word.speaker
        });
      });
    }

    // Calculate duration from word timings
    const duration = words.length > 0 ? words[words.length - 1].end : 0;

    return {
      transcript: transcript.trim(),
      confidence: confidence || 0,
      words: words,
      language: language,
      duration: duration
    };
  }

  /**
   * Get pronunciation feedback by comparing expected vs actual words
   */
  getPronunciationFeedback(
    expectedText: string,
    transcription: AudioTranscriptionResponse,
    language: string
  ) {
    const expectedWords = expectedText.toLowerCase().split(/\s+/);
    const actualWords = transcription.transcript.toLowerCase().split(/\s+/);
    
    const wordScores: any[] = [];
    let totalScore = 0;
    let matchedWords = 0;

    // Compare each expected word with actual words
    expectedWords.forEach((expectedWord, index) => {
      const actualWord = actualWords[index];
      const confidence = transcription.words.find(w => 
        w.word.toLowerCase() === actualWord
      )?.confidence || 0;

      if (actualWord && expectedWord === actualWord) {
        const score = Math.min(confidence * 100, 100);
        wordScores.push({
          word: expectedWord,
          score: score,
          expected: expectedWord,
          actual: actualWord,
          confidence: confidence
        });
        totalScore += score;
        matchedWords++;
      } else {
        wordScores.push({
          word: expectedWord,
          score: 0,
          expected: expectedWord,
          actual: actualWord || '',
          confidence: 0
        });
      }
    });

    const overallScore = matchedWords > 0 ? totalScore / matchedWords : 0;
    const accuracy = matchedWords / expectedWords.length;
    const fluency = transcription.confidence * 100;

    return {
      overallScore: Math.round(overallScore),
      wordScores: wordScores,
      accuracy: Math.round(accuracy * 100),
      fluency: Math.round(fluency),
      suggestions: this.generateSuggestions(wordScores, language)
    };
  }

  /**
   * Generate pronunciation improvement suggestions
   */
  private generateSuggestions(wordScores: any[], language: string): string[] {
    const suggestions: string[] = [];
    const lowScoreWords = wordScores.filter(w => w.score < 70);

    if (lowScoreWords.length > 0) {
      suggestions.push(`Focus on pronunciation of: ${lowScoreWords.map(w => w.word).join(', ')}`);
    }

    if (language === 'es') {
      suggestions.push('Practice rolling your "r" sounds for Spanish words');
    } else if (language === 'fr') {
      suggestions.push('Work on nasal sounds and silent letters in French');
    } else if (language === 'de') {
      suggestions.push('Practice the "ch" and "ü" sounds in German');
    }

    return suggestions;
  }

  /**
   * Get supported language models
   */
  getSupportedLanguages(): string[] {
    return [...this.SUPPORTED_LANGUAGES];
  }

  /**
   * Get available Deepgram models
   */
  getAvailableModels(): string[] {
    return [
      'nova-2',
      'nova',
      'enhanced',
      'base',
      'base-nova',
      'base-nova-2'
    ];
  }
}

// Export singleton instance
export const deepgramASRManager = new DeepgramASRManager();
export default deepgramASRManager; 