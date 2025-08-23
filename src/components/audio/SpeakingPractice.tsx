'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Volume2, Mic, Play, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import AudioRecorder from './AudioRecorder';
import AudioPlayer from './AudioPlayer';
import { AudioSynthesisRequest, AudioTranscriptionResponse, PronunciationFeedback } from '@/types/audio.types';
import { audioSynthesisManager } from '@/lib/audioSynthesis';
import { deepgramASRManager } from '@/lib/deepgramASR';

interface SpeakingPracticeProps {
  targetSentence: string;
  sentenceMeaning?: string; // Add English meaning
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  onPracticeComplete?: (feedback: PronunciationFeedback) => void;
  className?: string;
}

export default function SpeakingPractice({
  targetSentence,
  sentenceMeaning,
  language,
  difficulty,
  onPracticeComplete,
  className = ''
}: SpeakingPracticeProps) {
  const [currentStep, setCurrentStep] = useState<'listen' | 'speak' | 'feedback'>('listen');
  const [aiAudioUrl, setAiAudioUrl] = useState<string>('');
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<AudioTranscriptionResponse | null>(null);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<PronunciationFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Difficulty-based settings
  const difficultySettings = {
    beginner: { speed: 0.8, voice: 'alloy', maxDuration: 30 },
    intermediate: { speed: 1.0, voice: 'nova', maxDuration: 45 },
    advanced: { speed: 1.2, voice: 'shimmer', maxDuration: 60 }
  };

  const settings = difficultySettings[difficulty];

  // Generate AI audio when component mounts or sentence changes
  useEffect(() => {
    generateAIAudio();
  }, [targetSentence, language, difficulty]);

  // Generate AI speech for the target sentence
  const generateAIAudio = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const request: AudioSynthesisRequest = {
        text: targetSentence,
        language: language,
        voice: settings.voice,
        speed: settings.speed,
        quality: 'high'
      };

      const response = await audioSynthesisManager.synthesizeAudio(request);
      setAiAudioUrl(response.audioUrl);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI audio');
    } finally {
      setIsLoading(false);
    }
  }, [targetSentence, language, settings.voice, settings.speed]);

  // Handle user recording completion
  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    setUserAudioBlob(audioBlob);
    setCurrentStep('feedback');
    
    try {
      setIsLoading(true);
      setError(null);

      // Convert audio blob to base64 for API
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 properly
      let base64Audio = '';
      for (let i = 0; i < uint8Array.length; i++) {
        base64Audio += String.fromCharCode(uint8Array[i]);
      }
      base64Audio = btoa(base64Audio);

      console.log('Audio blob info:', {
        size: audioBlob.size,
        type: audioBlob.type,
        base64Length: base64Audio.length,
        mimeType: audioBlob.type
      });

      // Validate audio data
      if (audioBlob.size === 0) {
        throw new Error('Audio recording is empty. Please try recording again.');
      }

      if (audioBlob.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Audio file is too large. Please record a shorter audio clip.');
      }

      // Transcribe user's speech
      const transcriptionResponse = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          language: language,
          options: {
            punctuate: true,
            smart_format: true
          }
        })
      });

      if (!transcriptionResponse.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const transcriptionData: AudioTranscriptionResponse = await transcriptionResponse.json();
      setTranscription(transcriptionData);

      // Generate pronunciation feedback
      const feedback = deepgramASRManager.getPronunciationFeedback(
        targetSentence,
        transcriptionData,
        language
      );
      
      setPronunciationFeedback(feedback);
      onPracticeComplete?.(feedback);

    } catch (err) {
      console.error('Audio processing error:', err);
      let errorMessage = 'Failed to process audio';
      
      if (err instanceof Error) {
        if (err.message.includes('Deepgram API key not configured')) {
          errorMessage = 'Deepgram API key not configured. Please check your environment variables.';
        } else if (err.message.includes('Failed to transcribe audio')) {
          errorMessage = 'Audio transcription failed. Please check your microphone and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [targetSentence, language, onPracticeComplete]);

  // Reset practice session
  const resetPractice = useCallback(() => {
    setCurrentStep('listen');
    setUserAudioBlob(null);
    setTranscription(null);
    setPronunciationFeedback(null);
    setError(null);
  }, []);

  // Move to next step
  const nextStep = useCallback(() => {
    if (currentStep === 'listen') {
      setCurrentStep('speak');
    } else if (currentStep === 'speak') {
      setCurrentStep('feedback');
    }
  }, [currentStep]);

  // Get step instructions
  const getStepInstructions = () => {
    switch (currentStep) {
      case 'listen':
        return `Listen to the ${language.toUpperCase()} pronunciation (${difficulty} level)`;
      case 'speak':
        return `Repeat the sentence in ${language.toUpperCase()}`;
      case 'feedback':
        return 'Review your pronunciation feedback';
      default:
        return '';
    }
  };

  // Get step icon
  const getStepIcon = () => {
    switch (currentStep) {
      case 'listen':
        return <Volume2 className="w-6 h-6" />;
      case 'speak':
        return <Mic className="w-6 h-6" />;
      case 'feedback':
        return <CheckCircle className="w-6 h-6" />;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStepIcon()}
            <span>Speaking Practice - {difficulty.toUpperCase()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{getStepInstructions()}</p>
        </CardContent>
      </Card>

      {/* Target Sentence */}
      <Card>
        <CardHeader>
          <CardTitle>Target Sentence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-medium text-center p-4 bg-blue-50 rounded-lg">
            {targetSentence}
          </div>
          {sentenceMeaning && (
            <div className="text-lg text-gray-700 text-center p-3 bg-green-50 rounded-lg mt-3">
              <span className="font-medium">English:</span> {sentenceMeaning}
            </div>
          )}
          <div className="text-sm text-gray-500 text-center mt-2">
            Language: {language.toUpperCase()} | Difficulty: {difficulty}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Listen to AI */}
      {currentStep === 'listen' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Listen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Generating AI audio...</p>
              </div>
            ) : aiAudioUrl ? (
              <div className="space-y-4">
                <AudioPlayer 
                  audioUrl={aiAudioUrl} 
                  autoPlay={false}
                  onEnded={() => setCurrentStep('speak')}
                />
                <div className="text-center">
                  <Button onClick={nextStep} className="w-full">
                    Continue to Speaking
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-red-600">
                Failed to load AI audio
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: User Recording */}
      {currentStep === 'speak' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Speak</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              maxDuration={settings.maxDuration}
              language={language}
              disabled={isLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Feedback */}
      {currentStep === 'feedback' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Analyzing pronunciation...</p>
              </div>
            ) : pronunciationFeedback ? (
              <div className="space-y-4">
                {/* Overall Score */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {pronunciationFeedback.overallScore}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>

                {/* Detailed Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {pronunciationFeedback.accuracy}%
                    </div>
                    <div className="text-xs text-gray-600">Accuracy</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">
                      {pronunciationFeedback.fluency}%
                    </div>
                    <div className="text-xs text-gray-600">Fluency</div>
                  </div>
                </div>

                {/* Word-level Feedback */}
                {pronunciationFeedback.wordScores.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Word-by-word Analysis:</h4>
                    <div className="space-y-1">
                      {pronunciationFeedback.wordScores.map((wordScore, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{wordScore.word}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${
                              wordScore.score >= 80 ? 'text-green-600' :
                              wordScore.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {wordScore.score}%
                            </span>
                            {wordScore.score >= 80 ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {pronunciationFeedback.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Improvement Suggestions:</h4>
                    <ul className="space-y-1">
                      {pronunciationFeedback.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-700 bg-yellow-50 p-2 rounded">
                          💡 {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* User Recording Playback */}
                {userAudioBlob && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Your Recording:</h4>
                    <AudioPlayer 
                      audioUrl={URL.createObjectURL(userAudioBlob)}
                      showControls={true}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button onClick={resetPractice} variant="outline" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Practice Again
                  </Button>
                  <Button onClick={nextStep} className="flex-1" disabled>
                    Next Sentence
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-red-600">
                Failed to analyze pronunciation
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-2" />
              {error}
            </div>
            <div className="text-center mt-3">
              <Button onClick={resetPractice} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 