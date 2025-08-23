import { AudioSynthesisRequest, AudioSynthesisResponse, AudioCacheEntry } from '@/types/audio.types';

class AudioSynthesisManager {
  private cache: Map<string, AudioCacheEntry> = new Map();
  private readonly CACHE_EXPIRY_HOURS = 24;
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Synthesize audio from text using OpenAI TTS API
   */
  async synthesizeAudio(request: AudioSynthesisRequest): Promise<AudioSynthesisResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedEntry = this.getCachedAudio(cacheKey);
      
      if (cachedEntry) {
        return {
          audioUrl: cachedEntry.audioUrl,
          duration: 0, // Will be calculated from audio
          format: 'mp3',
          cached: true,
          metadata: {
            language: request.language,
            voice: request.voice || 'alloy',
            speed: request.speed || 1.0,
            quality: request.quality || 'high'
          }
        };
      }

      // Generate new audio
      const audioResponse = await this.callOpenAITTS(request);
      
      // Cache the result
      this.cacheAudio(cacheKey, request, audioResponse);
      
      return {
        audioUrl: audioResponse.audioUrl,
        duration: audioResponse.duration,
        format: 'mp3',
        cached: false,
        metadata: {
          language: request.language,
          voice: request.voice || 'alloy',
          speed: request.speed || 1.0,
          quality: request.quality || 'high'
        }
      };
    } catch (error) {
      console.error('Audio synthesis error:', error);
      throw new Error('Failed to synthesize audio');
    }
  }

  /**
   * Call OpenAI TTS API
   */
  private async callOpenAITTS(request: AudioSynthesisRequest): Promise<{ audioUrl: string; duration: number }> {
    const response = await fetch('/api/audio/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: AudioSynthesisRequest): string {
    const { text, language, voice, speed, quality } = request;
    return `${language}_${voice || 'alloy'}_${speed || 1.0}_${quality || 'high'}_${this.hashText(text)}`;
  }

  /**
   * Simple text hashing for cache keys
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached audio if available and not expired
   */
  private getCachedAudio(cacheKey: string): AudioCacheEntry | null {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    if (new Date() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Update access count
    entry.accessCount++;
    return entry;
  }

  /**
   * Cache audio with expiration
   */
  private cacheAudio(cacheKey: string, request: AudioSynthesisRequest, audioResponse: { audioUrl: string; duration: number }) {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    const entry: AudioCacheEntry = {
      id: cacheKey,
      text: request.text,
      language: request.language,
      audioUrl: audioResponse.audioUrl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000),
      accessCount: 1
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Clean up expired and least used cache entries
   */
  private cleanupCache() {
    const now = new Date();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    });

    // If still too many, remove least used
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([_, entry]) => now <= entry.expiresAt)
        .sort((a, b) => a[1].accessCount - b[1].accessCount);
      
      const toRemove = sortedEntries.slice(0, Math.floor(this.MAX_CACHE_SIZE / 2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = new Date();
    const totalEntries = this.cache.size;
    const expiredEntries = Array.from(this.cache.values()).filter(entry => now > entry.expiresAt).length;
    const activeEntries = totalEntries - expiredEntries;
    
    return {
      totalEntries,
      activeEntries,
      expiredEntries,
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const audioSynthesisManager = new AudioSynthesisManager();
export default audioSynthesisManager; 