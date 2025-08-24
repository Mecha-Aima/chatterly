'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabaseClient';
import { DifficultyLevel, SessionResponse } from '@/types/session.types';
import { TeachingResponse } from '@/lib/teachingMode';
import { audioSynthesisManager, TTSProvider } from '@/lib/audioSynthesis';
import AudioRecorder from '@/components/audio/AudioRecorder';
import AudioPlayer from '@/components/audio/AudioPlayer';

// Session flow states
type SessionFlowState = 
  | 'idle' 
  | 'starting' 
  | 'explanation' 
  | 'listening' 
  | 'speaking' 
  | 'feedback' 
  | 'next-sentence'
  | 'completed';

interface SessionTranscript {
  turns: Array<{
    turnNumber: number;
    sentence: string;
    meaning: string;
    explanation: string;
    userTranscript: string;
    pronunciationScore: number;
    feedback: string;
    timestamp: string;
  }>;
  sessionSummary: {
    totalTurns: number;
    averageScore: number;
    completedAt: string;
  };
}

export default function SessionsPage() {
  console.log('🎯 SessionsPage: Component mounted');

  const router = useRouter();

  // Core session state
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<SessionResponse | null>(null);
  const [sessionState, setSessionState] = useState<SessionFlowState>('idle');

  // Session configuration
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.BEGINNER);
  
  // Current turn state
  const [currentTurnNumber, setCurrentTurnNumber] = useState(1);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [currentMeaning, setCurrentMeaning] = useState<string>('');
  const [currentExplanation, setCurrentExplanation] = useState<string>('');
  const [currentFeedback, setCurrentFeedback] = useState<string>('');
  
  // Audio state
  const [explanationAudioUrl, setExplanationAudioUrl] = useState<string>('');
  const [feedbackAudioUrl, setFeedbackAudioUrl] = useState<string>('');
  const [pronunciationAudioUrl, setPronunciationAudioUrl] = useState<string>('');
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  
  // Audio loading states
  const [explanationAudioLoading, setExplanationAudioLoading] = useState<boolean>(false);
  const [pronunciationAudioLoading, setPronunciationAudioLoading] = useState<boolean>(false);
  const [feedbackAudioLoading, setFeedbackAudioLoading] = useState<boolean>(false);
  
  // User performance
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [pronunciationScore, setPronunciationScore] = useState<number>(0);
  const [isReadyForNextSentence, setIsReadyForNextSentence] = useState<boolean>(false);
  
  // Session transcript for saving
  const [sessionTranscript, setSessionTranscript] = useState<SessionTranscript>({
    turns: [],
    sessionSummary: { totalTurns: 0, averageScore: 0, completedAt: '' }
  });
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Language options
  const LANGUAGES = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' }
  ];

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔐 SessionsPage: Initializing auth');
      try {
        setAuthLoading(true);
        const supabase = createBrowserSupabaseClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Auth session error:', sessionError);
          setError('Authentication error occurred');
          return;
        }

        if (session?.access_token) {
          console.log('✅ Authentication successful, user ID:', session.user.id);
          setAuthToken(session.access_token);
          setError(null);
        } else {
          console.log('❌ No active session found');
          setError('Please log in to access sessions functionality');
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto-complete session when we reach completed state and have session data
  useEffect(() => {
    const autoCompleteSession = async () => {
      if (sessionState === 'completed' && currentSession && authToken && sessionTranscript.turns.length > 0) {
        console.log('🏁 Auto-completing session with final data');
        try {
          // Calculate session summary
          const totalTurns = sessionTranscript.turns.length;
          const averageScore = totalTurns > 0 
            ? sessionTranscript.turns.reduce((sum, turn) => sum + turn.pronunciationScore, 0) / totalTurns 
            : 0;

          const finalTranscript = {
            ...sessionTranscript,
            sessionSummary: {
              totalTurns,
              averageScore,
              completedAt: new Date().toISOString()
            }
          };

          // Update session in database
          const updateResponse = await fetch(`/api/sessions/${currentSession.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              ended_at: new Date().toISOString(),
              total_turns: totalTurns,
              completed_turns: totalTurns,
              session_transcript_json: finalTranscript,
              overall_progress_json: {
                averageScore,
                improvementAreas: averageScore < 70 ? ['pronunciation'] : [],
                strengths: averageScore >= 70 ? ['pronunciation'] : [],
                recommendation: averageScore >= 80 ? 'Ready for intermediate level' : 'Continue practicing at current level'
              }
            }),
          });

          if (updateResponse.ok) {
            console.log('✅ Session auto-completed successfully');
          }
        } catch (err) {
          console.error('❌ Failed to auto-complete session:', err);
        }
      }
    };

    autoCompleteSession();
  }, [sessionState, currentSession, authToken, sessionTranscript]);

  // Start a new session
  const startNewSession = useCallback(async () => {
    if (!authToken) {
      setError('Authentication required');
      return;
    }

    console.log('🚀 SessionsPage: Starting new session', {
        language: targetLanguage,
      difficulty: difficultyLevel
    });

    try {
      setLoading(true);
      setError(null);
      setSessionState('starting');

      // Create session in database
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
        target_language: targetLanguage,
        difficulty_level: difficultyLevel,
          persona_id: `${targetLanguage}-enhanced-tutor`
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const session: SessionResponse = await sessionResponse.json();
      setCurrentSession(session);
      setCurrentTurnNumber(1);
      
      // Initialize session transcript
      setSessionTranscript({
        turns: [],
        sessionSummary: { totalTurns: 0, averageScore: 0, completedAt: '' }
      });

      console.log('✅ Session created:', session.id);

      // Get first sentence and explanation
      await getNextSentenceAndExplanation();

    } catch (err) {
      console.error('❌ Failed to start session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setSessionState('idle');
    } finally {
      setLoading(false);
    }
  }, [authToken, targetLanguage, difficultyLevel]);

  // Get next sentence and explanation from LLM
  const getNextSentenceAndExplanation = useCallback(async () => {
    if (!authToken) return;

    console.log('📚 SessionsPage: Getting next sentence and explanation');

    try {
      setLoading(true);
      setSessionState('explanation');
      
      // Clear previous audio state
      setExplanationAudioUrl('');
      setPronunciationAudioUrl('');
      setExplanationAudioLoading(false);
      setPronunciationAudioLoading(false);

      // Get teaching response (explanation mode)
      const teachingResponse = await fetch('/api/teaching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
        language: targetLanguage,
        difficulty: difficultyLevel,
        turnNumber: currentTurnNumber,
          requestType: 'explanation',
        sessionContext: {
            previousSentences: sessionTranscript.turns.map(t => t.sentence),
            userProgress: `${sessionTranscript.turns.length} completed turns`
          }
        }),
      });

      if (!teachingResponse.ok) {
        throw new Error('Failed to get teaching response');
      }

      const teaching: TeachingResponse = await teachingResponse.json();
      
      if (!teaching.success || !teaching.data) {
        throw new Error('Invalid teaching response');
      }

      console.log('✅ Teaching response received:', teaching.data);

      // Set current sentence data - this allows UI to show immediately
      setCurrentSentence(teaching.data.sentence);
      setCurrentMeaning(teaching.data.meaning);
      setCurrentExplanation(teaching.data.teaching_explanation);
      
      // Change state to show content immediately (before audio loads)
      setSessionState('listening');
      setLoading(false);

      // Generate audio in parallel without blocking UI
      const generateAudio = async () => {
        try {
          // Start pronunciation audio loading
          setPronunciationAudioLoading(true);
          const pronunciationAudio = await audioSynthesisManager.synthesizeAudio({
            text: teaching.data?.sentence || '',
            language: targetLanguage,
            provider: 'openai' as TTSProvider,
            speed: 0.9
          });
          setPronunciationAudioUrl(pronunciationAudio.audioUrl);
          setPronunciationAudioLoading(false);
          
          // Start explanation audio loading
          setExplanationAudioLoading(true);
          const explanationAudio = await audioSynthesisManager.synthesizeAudio({
            text: teaching.data?.teaching_explanation || '',
            language: 'en', // Explanation is in English
            provider: 'deepgram' as TTSProvider
          });
          setExplanationAudioUrl(explanationAudio.audioUrl);
          setExplanationAudioLoading(false);

          console.log('✅ Audio generated for explanation and pronunciation');
        } catch (audioErr) {
          console.error('❌ Failed to generate audio:', audioErr);
          setPronunciationAudioLoading(false);
          setExplanationAudioLoading(false);
          // Don't block the session for audio errors, just log them
        }
      };

      // Generate audio asynchronously
      generateAudio();

    } catch (err) {
      console.error('❌ Failed to get sentence and explanation:', err);
      setError(err instanceof Error ? err.message : 'Failed to get next sentence');
      setSessionState('idle');
      setLoading(false);
    }
  }, [authToken, targetLanguage, difficultyLevel, currentTurnNumber, sessionTranscript]);

  // Handle user recording completion
  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    console.log('🎤 SessionsPage: Recording completed', {
      size: audioBlob.size,
      type: audioBlob.type
    });

    setUserAudioBlob(audioBlob);
    setSessionState('feedback');

    try {
      setLoading(true);

      // Convert audio to base64 for transcription
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let base64Audio = '';
      for (let i = 0; i < uint8Array.length; i++) {
        base64Audio += String.fromCharCode(uint8Array[i]);
      }
      base64Audio = btoa(base64Audio);

      // Transcribe user's speech
      const transcriptionResponse = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          language: targetLanguage,
          options: {
            punctuate: true,
            smart_format: true
          }
        })
      });

      if (!transcriptionResponse.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const transcriptionData = await transcriptionResponse.json();
      setUserTranscript(transcriptionData.transcript);
      
      // Calculate pronunciation score (simplified)
      const score = Math.max(0, Math.min(100, transcriptionData.confidence * 100));
      setPronunciationScore(score);

      console.log('✅ Transcription completed:', {
        transcript: transcriptionData.transcript,
        score: score
      });

      // Get AI feedback
      const feedbackResponse = await fetch('/api/teaching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          language: targetLanguage,
          difficulty: difficultyLevel,
          turnNumber: currentTurnNumber,
          requestType: 'feedback',
          userInput: {
            transcript: transcriptionData.transcript,
            confidenceScore: transcriptionData.confidence * 100,
            pronunciationScore: score,
            targetSentence: currentSentence
          }
        }),
      });

      if (!feedbackResponse.ok) {
        throw new Error('Failed to get feedback');
      }

      const feedback: TeachingResponse = await feedbackResponse.json();
      
      if (feedback.success && feedback.data?.feedback) {
        setCurrentFeedback(feedback.data.feedback);
        setIsReadyForNextSentence(feedback.data.nextSentenceReady || false);

        // Generate feedback audio asynchronously (Deepgram for feedback)
        const generateFeedbackAudio = async () => {
          try {
            setFeedbackAudioLoading(true);
            const feedbackAudio = await audioSynthesisManager.synthesizeAudio({
              text: feedback.data?.feedback || '',
              language: 'en', // Feedback is in English
              provider: 'deepgram' as TTSProvider
            });
            setFeedbackAudioUrl(feedbackAudio.audioUrl);
            setFeedbackAudioLoading(false);
          } catch (audioErr) {
            console.error('❌ Failed to generate feedback audio:', audioErr);
            setFeedbackAudioLoading(false);
          }
        };

        generateFeedbackAudio();

        // Add to session transcript
        const newTurn = {
          turnNumber: currentTurnNumber,
          sentence: currentSentence,
          meaning: currentMeaning,
          explanation: currentExplanation,
          userTranscript: transcriptionData.transcript,
          pronunciationScore: score,
          feedback: feedback.data.feedback,
          timestamp: new Date().toISOString()
        };

        setSessionTranscript(prev => ({
          ...prev,
          turns: [...prev.turns, newTurn]
        }));

        console.log('✅ Feedback generated and audio created');
        
        // Stay in feedback state - let user decide when to continue
        // Don't automatically transition based on score
      }

    } catch (err) {
      console.error('❌ Failed to process recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to process recording');
    } finally {
      setLoading(false);
    }
  }, [authToken, targetLanguage, difficultyLevel, currentTurnNumber, currentSentence, currentMeaning, currentExplanation]);

  // Move to next sentence
  const moveToNextSentence = useCallback(async () => {
    console.log('➡️ SessionsPage: Moving to next sentence');
    
    const nextTurnNumber = currentTurnNumber + 1;
    
    // Check if we've completed 3 turns
    if (nextTurnNumber > 3) {
      console.log('🏁 Session completed - 3 turns reached');
      // Set state to completed instead of calling completeSession directly
      setSessionState('completed');
      return;
    }
    
    setCurrentTurnNumber(nextTurnNumber);
    setUserTranscript('');
    setPronunciationScore(0);
    setCurrentFeedback('');
    setIsReadyForNextSentence(false);
    setUserAudioBlob(null);
    setFeedbackAudioUrl('');
    setFeedbackAudioLoading(false);
    
    await getNextSentenceAndExplanation();
  }, [currentTurnNumber, getNextSentenceAndExplanation]);

  // Complete session
  const completeSession = useCallback(async () => {
    if (!currentSession || !authToken) return;

    console.log('🏁 SessionsPage: Completing session');

    try {
      setLoading(true);
      setSessionState('completed');

      // Calculate session summary
      const totalTurns = sessionTranscript.turns.length;
      const averageScore = totalTurns > 0 
        ? sessionTranscript.turns.reduce((sum, turn) => sum + turn.pronunciationScore, 0) / totalTurns 
        : 0;

      const finalTranscript = {
        ...sessionTranscript,
        sessionSummary: {
          totalTurns,
          averageScore,
          completedAt: new Date().toISOString()
        }
      };

      // Update session in database with transcript and progress
      const updateResponse = await fetch(`/api/sessions/${currentSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          total_turns: totalTurns,
          completed_turns: totalTurns,
          session_transcript_json: finalTranscript,
          overall_progress_json: {
            averageScore,
            improvementAreas: averageScore < 70 ? ['pronunciation'] : [],
            strengths: averageScore >= 70 ? ['pronunciation'] : [],
            recommendation: averageScore >= 80 ? 'Ready for intermediate level' : 'Continue practicing at current level'
          }
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update session');
      }

      console.log('✅ Session completed and saved:', {
        totalTurns,
        averageScore,
        sessionId: currentSession.id
      });

    } catch (err) {
      console.error('❌ Failed to complete session:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setLoading(false);
    }
  }, [currentSession, authToken, sessionTranscript]);

  // Reset session
  const resetSession = useCallback(() => {
    console.log('🔄 SessionsPage: Resetting session');
    
    setCurrentSession(null);
    setSessionState('idle');
    setCurrentTurnNumber(1);
    setCurrentSentence('');
    setCurrentMeaning('');
    setCurrentExplanation('');
    setCurrentFeedback('');
    setExplanationAudioUrl('');
    setFeedbackAudioUrl('');
    setPronunciationAudioUrl('');
    setUserAudioBlob(null);
    setUserTranscript('');
    setPronunciationScore(0);
    setIsReadyForNextSentence(false);
    setExplanationAudioLoading(false);
    setPronunciationAudioLoading(false);
    setFeedbackAudioLoading(false);
    setSessionTranscript({
      turns: [],
      sessionSummary: { totalTurns: 0, averageScore: 0, completedAt: '' }
    });
    setError(null);
  }, []);

  // Loading and authentication checks
  if (authLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Loading Enhanced Session...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-600">Initializing...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              Please log in to access the enhanced session features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="flex justify-start w-fit items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Enhanced Language Learning Lesson</h1>
            <p className="text-gray-600 mt-2">AI-powered interactive language learning experience</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            sessionState === 'idle' ? 'bg-gray-100 text-gray-600' :
            sessionState === 'starting' ? 'bg-blue-100 text-blue-700' :
            sessionState === 'explanation' || sessionState === 'listening' ? 'bg-green-100 text-green-700' :
            sessionState === 'speaking' ? 'bg-yellow-100 text-yellow-700' :
            sessionState === 'feedback' ? 'bg-purple-100 text-purple-700' :
            sessionState === 'next-sentence' ? 'bg-orange-100 text-orange-700' :
            sessionState === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-gray-100 text-gray-600'
            }`}>
            {sessionState.charAt(0).toUpperCase() + sessionState.slice(1).replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 font-medium">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Session Configuration */}
      {sessionState === 'idle' && (
      <Card>
        <CardHeader>
            <CardTitle>🎯 Start New Learning Lesson</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-2">Target Language</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">Difficulty Level</label>
              <select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                className="w-full p-2 border rounded-md"
              >
                {Object.values(DifficultyLevel).map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            </div>
                <Button
              onClick={startNewSession}
                  disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
                >
              {loading ? '⏳ Starting...' : '🚀 Start Lesson'}
                </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Sentence Display */}
      {(sessionState === 'listening' || sessionState === 'speaking' || sessionState === 'next-sentence') && currentSentence && (
        <Card>
          <CardHeader>
            <CardTitle>📖 Current Sentence - Turn {currentTurnNumber} of 3</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-medium text-center p-4 bg-blue-50 rounded-lg">
              {currentSentence}
            </div>
            <div className="text-lg text-gray-700 text-center p-3 bg-green-50 rounded-lg">
              <span className="font-medium">English:</span> {currentMeaning}
          </div>

            {/* Explanation */}
            {currentExplanation && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium mb-2">AI Explanation:</h4>
                <p className="text-gray-700">{currentExplanation}</p>
                <div className="mt-3">
                  {explanationAudioLoading ? (
                    <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-purple-200">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-purple-600">Generating explanation audio...</span>
                    </div>
                  ) : explanationAudioUrl ? (
                    <AudioPlayer 
                      audioUrl={explanationAudioUrl} 
                      autoPlay={sessionState === 'listening'}
                      showControls={true}
                    />
                  ) : (
                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                      <span className="text-gray-500">Audio will load shortly...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pronunciation Sample */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium mb-2">Pronunciation Sample:</h4>
              {pronunciationAudioLoading ? (
                <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-yellow-200">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <span className="text-yellow-600">Generating pronunciation audio...</span>
                </div>
              ) : pronunciationAudioUrl ? (
                <AudioPlayer 
                  audioUrl={pronunciationAudioUrl} 
                  showControls={true}
                />
              ) : (
                <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                  <span className="text-gray-500">Audio will load shortly...</span>
                </div>
              )}
            </div>
        </CardContent>
      </Card>
      )}

      {/* Speaking Practice */}
      {sessionState === 'listening' && (
        <Card>
          <CardHeader>
            <CardTitle>🎤 Your Turn to Speak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Listen to the explanation and pronunciation sample above, then record yourself saying the sentence.
              </p>
              {(explanationAudioLoading || pronunciationAudioLoading) && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-700 text-sm">
                    💡 Audio is still loading, but you can start practicing! Use the text to practice pronunciation.
                  </p>
                </div>
              )}
              <Button 
                onClick={() => setSessionState('speaking')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                🎤 Start Recording
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recording Interface */}
      {sessionState === 'speaking' && (
        <Card>
          <CardHeader>
            <CardTitle>🎙️ Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              maxDuration={30}
              language={targetLanguage}
              disabled={loading}
            />
          </CardContent>
        </Card>
      )}

      {/* Feedback Display */}
      {sessionState === 'feedback' && currentFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>💬 AI Feedback - Turn {currentTurnNumber} of 3</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Session Progress */}
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3].map((turnNum) => (
                <div
                  key={turnNum}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    turnNum < currentTurnNumber
                      ? 'bg-green-500 text-white' // Completed
                      : turnNum === currentTurnNumber
                      ? 'bg-blue-500 text-white' // Current
                      : 'bg-gray-200 text-gray-500' // Future
                  }`}
                >
                  {turnNum < currentTurnNumber ? '✓' : turnNum}
                </div>
              ))}
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {pronunciationScore.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-600">Pronunciation Score</div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">Target Sentence:</h4>
              <p className="text-lg font-medium text-blue-800">"{currentSentence}"</p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium mb-2">Your Response:</h4>
              <p className="text-gray-700 italic">"{userTranscript}"</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium mb-2">AI Feedback:</h4>
              <p className="text-gray-700">{currentFeedback}</p>
              <div className="mt-3">
                {feedbackAudioLoading ? (
                  <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-purple-200">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="text-purple-600">Generating feedback audio...</span>
                  </div>
                ) : feedbackAudioUrl ? (
                  <AudioPlayer 
                    audioUrl={feedbackAudioUrl} 
                    autoPlay={true}
                    showControls={true}
                  />
                ) : (
                  <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                    <span className="text-gray-500">Audio will load shortly...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setSessionState('speaking')}
                variant="outline"
                className="flex-1"
              >
                🔄 Try Again
              </Button>
              {currentTurnNumber >= 3 ? (
                <Button
                  onClick={completeSession}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                >
                  🏁 Complete Lesson
                </Button>
              ) : (
                <Button
                  onClick={moveToNextSentence}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  ➡️ {pronunciationScore > 70 ? 'Next Sentence' : 'Continue Anyway'} ({currentTurnNumber + 1}/3)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Controls */}
      {currentSession && sessionState !== 'idle' && sessionState !== 'completed' && sessionState !== 'feedback' && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Lesson Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Indicator */}
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3].map((turnNum) => (
                <div
                  key={turnNum}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    turnNum < currentTurnNumber
                      ? 'bg-green-500 text-white' // Completed
                      : turnNum === currentTurnNumber
                      ? 'bg-blue-500 text-white' // Current
                      : 'bg-gray-200 text-gray-500' // Future
                  }`}
                >
                  {turnNum < currentTurnNumber ? '✓' : turnNum}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold">{currentTurnNumber}</div>
                <div className="text-sm text-gray-600">Current Turn</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold">{sessionTranscript.turns.length - 1}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold">{3 - sessionTranscript.turns.length}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={completeSession}
                variant="destructive"
                className="flex-1"
                disabled={loading}
              >
                🏁 End Early
              </Button>
              <Button
                onClick={resetSession}
                variant="outline"
                className="flex-1"
              >
                🔄 Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Completed */}
      {sessionState === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>🎉 Lesson Completed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {sessionTranscript.sessionSummary.averageScore}%
              </div>
              <div className="text-gray-600">Average Score</div>
                  </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold">{sessionTranscript.turns.length}</div>
                <div className="text-sm text-gray-600">Total Sentences</div>
                      </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold">
                  {sessionTranscript.turns.filter(t => t.pronunciationScore > 70).length}
                              </div>
                <div className="text-sm text-gray-600">Good Scores (&gt;70%)</div>
                            </div>
                                </div>

                                <Button
              onClick={resetSession}
              className="w-full bg-blue-600 hover:bg-blue-700"
                                >
              🚀 Start New Lesson
                                </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}