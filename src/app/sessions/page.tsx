'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { createBrowserSupabaseClient } from '@/lib/supabaseClient';
import SpeakingPractice from '@/components/audio/SpeakingPractice';
import { 
  SessionResponse, 
  TurnResponse, 
  SessionCreateRequest, 
  TurnCreateRequest, 
  TurnUpdateRequest,
  DifficultyLevel,
  ErrorResponse 
} from '@/types/session.types';

// Expanded dummy data for realistic language learning testing
const LANGUAGE_SENTENCES = {
  es: [
    { sentence: "Hola, ¿cómo estás?", meaning: "Hello, how are you?" },
    { sentence: "Me llamo María", meaning: "My name is María" },
    { sentence: "¿Dónde está el baño?", meaning: "Where is the bathroom?" },
    { sentence: "Gracias por tu ayuda", meaning: "Thank you for your help" },
    { sentence: "No hablo español muy bien", meaning: "I don't speak Spanish very well" },
    { sentence: "¿Cuánto cuesta esto?", meaning: "How much does this cost?" },
    { sentence: "Perdón, no entiendo", meaning: "Sorry, I don't understand" },
    { sentence: "¿Puede repetir, por favor?", meaning: "Can you repeat, please?" },
    { sentence: "¿Qué hora es?", meaning: "What time is it?" },
    { sentence: "Tengo hambre", meaning: "I am hungry" },
    { sentence: "¿Habla usted inglés?", meaning: "Do you speak English?" },
    { sentence: "Necesito ayuda", meaning: "I need help" }
  ],
  fr: [
    { sentence: "Bonjour, comment allez-vous?", meaning: "Hello, how are you?" },
    { sentence: "Je m'appelle Pierre", meaning: "My name is Pierre" },
    { sentence: "Où sont les toilettes?", meaning: "Where is the bathroom?" },
    { sentence: "Merci beaucoup", meaning: "Thank you very much" },
    { sentence: "Je ne parle pas bien français", meaning: "I don't speak French well" },
    { sentence: "Combien ça coûte?", meaning: "How much does it cost?" },
    { sentence: "Excusez-moi, je ne comprends pas", meaning: "Excuse me, I don't understand" },
    { sentence: "Pouvez-vous répéter?", meaning: "Can you repeat?" }
  ],
  de: [
    { sentence: "Hallo, wie geht es Ihnen?", meaning: "Hello, how are you?" },
    { sentence: "Ich heiße Hans", meaning: "My name is Hans" },
    { sentence: "Wo ist die Toilette?", meaning: "Where is the bathroom?" },
    { sentence: "Vielen Dank", meaning: "Thank you very much" },
    { sentence: "Ich spreche nicht gut Deutsch", meaning: "I don't speak German well" },
    { sentence: "Wie viel kostet das?", meaning: "How much does it cost?" },
    { sentence: "Entschuldigung, ich verstehe nicht", meaning: "Sorry, I don't understand" },
    { sentence: "Können Sie das wiederholen?", meaning: "Can you repeat that?" }
  ],
  it: [
    { sentence: "Ciao, come stai?", meaning: "Hello, how are you?" },
    { sentence: "Mi chiamo Marco", meaning: "My name is Marco" },
    { sentence: "Dov'è il bagno?", meaning: "Where is the bathroom?" },
    { sentence: "Grazie mille", meaning: "Thank you very much" },
    { sentence: "Non parlo bene italiano", meaning: "I don't speak Italian well" },
    { sentence: "Quanto costa?", meaning: "How much does it cost?" },
    { sentence: "Scusi, non capisco", meaning: "Sorry, I don't understand" },
    { sentence: "Può ripetere?", meaning: "Can you repeat?" }
  ],
  pt: [
    { sentence: "Olá, como está?", meaning: "Hello, how are you?" },
    { sentence: "Meu nome é João", meaning: "My name is João" },
    { sentence: "Onde fica o banheiro?", meaning: "Where is the bathroom?" },
    { sentence: "Muito obrigado", meaning: "Thank you very much" },
    { sentence: "Não falo português muito bem", meaning: "I don't speak Portuguese very well" },
    { sentence: "Quanto custa?", meaning: "How much does it cost?" },
    { sentence: "Desculpe, não entendo", meaning: "Sorry, I don't understand" },
    { sentence: "Pode repetir?", meaning: "Can you repeat?" }
  ]
};

const LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' }
];

export default function SessionsPage() {
  // State management
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionResponse | null>(null);
  const [turns, setTurns] = useState<TurnResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Form states
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.BEGINNER);
  const [currentTurnNumber, setCurrentTurnNumber] = useState(1);
  const [userTranscript, setUserTranscript] = useState('');
  
  // Session testing states
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'manual' | 'auto'>('manual');
  const [autoInterval, setAutoInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastApiCall, setLastApiCall] = useState<string>('');
  const [apiCallHistory, setApiCallHistory] = useState<string[]>([]);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'creating' | 'active' | 'completing' | 'completed'>('idle');
  
  // Speaking practice states
  const [showSpeakingPractice, setShowSpeakingPractice] = useState(false);
  const [currentPracticeSentence, setCurrentPracticeSentence] = useState('');

  // Helper: Get sentences for current language
  const getCurrentLanguageSentences = () => {
    return LANGUAGE_SENTENCES[targetLanguage as keyof typeof LANGUAGE_SENTENCES] || LANGUAGE_SENTENCES.es;
  };

  // Start speaking practice with random sentence
  const startSpeakingPractice = () => {
    const sentences = getCurrentLanguageSentences();
    const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
    setCurrentPracticeSentence(randomSentence.sentence);
    setShowSpeakingPractice(true);
  };

  // Get current practice sentence meaning
  const getCurrentPracticeSentenceMeaning = () => {
    if (!currentPracticeSentence) return '';
    const sentences = getCurrentLanguageSentences();
    const sentence = sentences.find(s => s.sentence === currentPracticeSentence);
    return sentence?.meaning || '';
  };

  // Handle speaking practice completion
  const handlePracticeComplete = (feedback: any) => {
    console.log('Speaking practice completed:', feedback);
    // Here you could save the feedback to the database
    // or integrate it with the existing session system
  };

  // Enhanced API Helper function with logging
  const apiCall = async <T = any>(endpoint: string, options: RequestInit = {}, description: string = ''): Promise<T> => {
    if (!authToken) {
      throw new Error('Authentication required');
    }

    const method = options.method || 'GET';
    const apiCallDescription = `${method} ${endpoint}${description ? ` - ${description}` : ''}`;
    
    // Log API call
    setLastApiCall(apiCallDescription);
    setApiCallHistory(prev => [`${new Date().toLocaleTimeString()}: ${apiCallDescription}`, ...prev.slice(0, 9)]);
    
    console.log(`🔗 API Call: ${apiCallDescription}`);

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData: ErrorResponse = await response.json();
        errorMessage = errorData.error.message || errorMessage;
      } catch {
        // If we can't parse error, use status text
        errorMessage = response.statusText || errorMessage;
      }
      console.error(`❌ API Error: ${apiCallDescription} - ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log(`✅ API Success: ${apiCallDescription}`, result);
    return result;
  };

  // 1. GET /api/sessions - Fetch all sessions
  const fetchSessions = useCallback(async (token: string = authToken!) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('No auth token available');
      }

      const response = await fetch('/api/sessions', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData: ErrorResponse = await response.json();
          errorMessage = errorData.error.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setSessions(data);
      console.log('✅ Sessions fetched:', data.length, 'sessions');
    } catch (err) {
      setError(`Failed to fetch sessions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  // Initialize auth token and fetch sessions
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuthLoading(true);
        const supabase = createBrowserSupabaseClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Auth session error:', sessionError);
          setError('Authentication error occurred');
          return;
        }
        
        if (session?.access_token) {
          console.log('✅ Authentication successful, user ID:', session.user.id);
          setAuthToken(session.access_token);
          setError(null);
          await fetchSessions(session.access_token);
        } else {
          console.log('❌ No active session found');
          setError('Please log in to access sessions functionality');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setAuthLoading(false);
      }
    };
    
    initializeAuth();

    // Listen for auth state changes
    const supabase = createBrowserSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.access_token) {
            setAuthToken(session.access_token);
            setError(null);
            setAuthLoading(false);
            await fetchSessions(session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthToken(null);
          setSessions([]);
          setCurrentSession(null);
          setTurns([]);
          setError('Please log in to access sessions functionality');
          setAuthLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSessions]);

  // Cleanup auto interval on unmount
  useEffect(() => {
    return () => {
      if (autoInterval) {
        clearInterval(autoInterval);
      }
    };
  }, [autoInterval]);

  // 2. POST /api/sessions - Create new session and start it
  const startNewSession = async () => {
    try {
      setLoading(true);
      setError(null);
      setSessionStatus('creating');
      
      const sessionData: SessionCreateRequest = {
        target_language: targetLanguage,
        difficulty_level: difficultyLevel,
        persona_id: `${targetLanguage}-teacher-demo`
      };

      const newSession = await apiCall<SessionResponse>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      }, 'Create new learning session');

      setCurrentSession(newSession);
      await fetchSessions();
      setCurrentTurnNumber(1);
      setTurns([]);
      setIsSessionActive(true);
      setSessionStatus('active');
      
      console.log('✅ New session started:', newSession.id);
    } catch (err) {
      setError(`Failed to start session: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSessionStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  // 3. GET /api/sessions/[sessionId] - Get specific session
  const fetchSpecificSession = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const session = await apiCall<SessionResponse>(`/api/sessions/${sessionId}`, {}, `Fetch session ${sessionId.slice(0, 8)}`);
      setCurrentSession(session);
      console.log('✅ Session fetched:', session.id);
    } catch (err) {
      setError(`Failed to fetch session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. PATCH /api/sessions/[sessionId] - Update session (example with difficulty change)
  const updateSessionDifficulty = async (newDifficulty: DifficultyLevel) => {
    if (!currentSession) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const updateData = { difficulty_level: newDifficulty };
      const updatedSession = await apiCall<SessionResponse>(`/api/sessions/${currentSession.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      }, `Update session difficulty to ${newDifficulty}`);
      
      setCurrentSession(updatedSession);
      setDifficultyLevel(newDifficulty);
      console.log('✅ Session difficulty updated:', newDifficulty);
    } catch (err) {
      setError(`Failed to update session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 5. POST /api/sessions/[sessionId]/turns - Create new turn
  const createTurn = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      setError(null);

      const sentences = getCurrentLanguageSentences();
      const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
      
      const turnData: TurnCreateRequest = {
        session_id: currentSession.id,
        turn_number: currentTurnNumber,
        target_sentence: randomSentence.sentence,
        sentence_meaning: randomSentence.meaning
      };

      const newTurn = await apiCall<TurnResponse>(`/api/sessions/${currentSession.id}/turns`, {
        method: 'POST',
        body: JSON.stringify(turnData),
      }, `Create turn #${currentTurnNumber}`);

      await fetchTurns(currentSession.id);
      setCurrentTurnNumber(prev => prev + 1);
      console.log('✅ Turn created:', newTurn.id, 'Turn #' + newTurn.turn_number);
    } catch (err) {
      setError(`Failed to create turn: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 6. GET /api/sessions/[sessionId]/turns - Fetch session turns
  const fetchTurns = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall<TurnResponse[]>(`/api/sessions/${sessionId}/turns`, {}, `Fetch turns for session ${sessionId.slice(0, 8)}`);
      setTurns(data);
      console.log('✅ Turns fetched:', data.length, 'turns');
    } catch (err) {
      setError(`Failed to fetch turns: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 7. GET /api/sessions/[sessionId]/turns/[turnId] - Get specific turn
  const fetchSpecificTurn = async (sessionId: string, turnId: string) => {
    try {
      setLoading(true);
      setError(null);
      const turn = await apiCall<TurnResponse>(`/api/sessions/${sessionId}/turns/${turnId}`, {}, `Fetch turn ${turnId.slice(0, 8)}`);
      console.log('✅ Specific turn fetched:', turn.id, turn.target_sentence);
    } catch (err) {
      setError(`Failed to fetch turn: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 8. PATCH /api/sessions/[sessionId]/turns/[turnId] - Update turn with user response
  const completeTurn = async (turnId: string, targetSentence: string, userInput?: string) => {
    if (!currentSession) return;

    try {
      setLoading(true);
      setError(null);

      // Simulate realistic pronunciation and grammar feedback
      const pronunciationScore = Math.floor(Math.random() * 30) + 70; // 70-100
      const grammarScore = Math.floor(Math.random() * 25) + 75; // 75-100

      const updateData: TurnUpdateRequest = {
        user_transcript: userInput || userTranscript || `${targetSentence} (auto-generated response)`,
        pronunciation_feedback_json: {
          overall_score: pronunciationScore,
          feedback: pronunciationScore > 90 ? "Excellent pronunciation!" : 
                   pronunciationScore > 80 ? "Good pronunciation!" : 
                   pronunciationScore > 70 ? "Pronunciation needs improvement" : 
                   "Keep practicing!",
          detailed_feedback: {
            clarity: pronunciationScore,
            accent: Math.max(60, pronunciationScore - 10),
            fluency: Math.max(65, pronunciationScore - 15)
          }
        },
        grammar_feedback_json: {
          overall_score: grammarScore,
          feedback: grammarScore > 90 ? "Perfect grammar!" : 
                   grammarScore > 80 ? "Very good grammar" : 
                   "Grammar needs some work",
          corrections: grammarScore < 85 ? ["Minor verb conjugation error"] : []
        },
        turn_completed: true
      };

      const updatedTurn = await apiCall<TurnResponse>(`/api/sessions/${currentSession.id}/turns/${turnId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      }, `Complete turn ${turnId.slice(0, 8)}`);

      await fetchTurns(currentSession.id);
      await fetchSpecificSession(currentSession.id); // Refresh session to get updated completed_turns
      setUserTranscript('');
      console.log('✅ Turn completed:', updatedTurn.id, 'Score:', pronunciationScore);
    } catch (err) {
      setError(`Failed to complete turn: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 9. POST /api/sessions/[sessionId]/complete - Complete entire session
  const completeSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      setError(null);
      setSessionStatus('completing');

      const result = await apiCall(`/api/sessions/${currentSession.id}/complete`, {
        method: 'POST',
      }, 'Complete learning session');

      console.log('✅ Session completed:', result);
      await fetchSessions();
      setCurrentSession(null);
      setTurns([]);
      setCurrentTurnNumber(1);
      setIsSessionActive(false);
      setSessionStatus('completed');
      
      // Show completion summary
      if (result.summary) {
        setError(null); // Clear any previous errors to show success message
        console.log('Session Summary:', result.summary);
      }
    } catch (err) {
      setError(`Failed to complete session: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSessionStatus('active');
    } finally {
      setLoading(false);
    }
  };

  // Auto practice mode
  const startAutoPractice = () => {
    if (!currentSession || autoInterval) return;
    
    setPracticeMode('auto');
    const interval = setInterval(async () => {
      // Create a turn and immediately complete it
      await createTurn();
      // Wait a bit then complete the last turn
      setTimeout(async () => {
        const latestTurns = await apiCall<TurnResponse[]>(`/api/sessions/${currentSession.id}/turns`);
        const incompleteTurn = latestTurns.find(t => !t.turn_completed);
        if (incompleteTurn) {
          await completeTurn(incompleteTurn.id, incompleteTurn.target_sentence);
        }
      }, 1000);
    }, 3000); // Every 3 seconds
    
    setAutoInterval(interval);
  };

  const stopAutoPractice = () => {
    if (autoInterval) {
      clearInterval(autoInterval);
      setAutoInterval(null);
    }
    setPracticeMode('manual');
  };

  // Select and view session details
  const selectSession = async (session: SessionResponse) => {
    setCurrentSession(session);
    setIsSessionActive(!session.ended_at);
    setSessionStatus(session.ended_at ? 'completed' : 'active');
    await fetchTurns(session.id);
    
    // Set the next turn number based on existing turns
    const maxTurn = Math.max(...turns.map(t => t.turn_number), 0);
    setCurrentTurnNumber(maxTurn + 1);
  };

  // Calculate session status
  const getSessionStatus = (session: SessionResponse) => {
    if (session.ended_at) return 'Completed';
    if (session.started_at) return 'In Progress';
    return 'Created';
  };

  // Loading and authentication checks
  if (authLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Loading Session Management...</CardTitle>
            <CardDescription>Checking authentication status</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
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
            <CardDescription>Please log in to access the Session Management Demo</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-yellow-700">
              You need to be logged in to test the session management features. 
              Please go to the login page to authenticate.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Language Learning Session Demo</h1>
          <p className="text-gray-600 mt-2">Complete testing interface for all session management API endpoints</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchSessions()} disabled={loading} variant="outline">
            🔄 Refresh Sessions
          </Button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            sessionStatus === 'active' ? 'bg-green-100 text-green-700' :
            sessionStatus === 'creating' ? 'bg-blue-100 text-blue-700' :
            sessionStatus === 'completing' ? 'bg-orange-100 text-orange-700' :
            sessionStatus === 'completed' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
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

      {/* Session Creation / Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Session Control Panel</CardTitle>
          <CardDescription>Create new sessions and manage active session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="language">Target Language</Label>
              <select
                id="language"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={isSessionActive}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <select
                id="difficulty"
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
            <div className="flex items-end">
              {currentSession && isSessionActive && (
                <Button 
                  onClick={() => updateSessionDifficulty(difficultyLevel)} 
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Update Difficulty
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {!isSessionActive ? (
              <Button 
                onClick={startNewSession} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && sessionStatus === 'creating' ? '⏳ Starting...' : '🚀 Start New Session'}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={completeSession} 
                  disabled={loading || !currentSession || (currentSession.total_turns || 0) === 0}
                  variant="destructive"
                >
                  {loading && sessionStatus === 'completing' ? '⏳ Ending...' : '🏁 End Session'}
                </Button>
                <Button 
                  onClick={createTurn} 
                  disabled={loading}
                  variant="outline"
                >
                  ➕ Add Practice Turn
                </Button>
                {practiceMode === 'manual' ? (
                  <Button 
                    onClick={startAutoPractice} 
                    disabled={loading}
                    variant="outline"
                  >
                    🤖 Start Auto Practice
                  </Button>
                ) : (
                  <Button 
                    onClick={stopAutoPractice}
                    variant="outline"
                  >
                    ⏹️ Stop Auto Practice
                  </Button>
                )}
                <Button 
                  onClick={startSpeakingPractice}
                  disabled={loading}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  🎤 Start Speaking Practice
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Speaking Practice Section */}
      {showSpeakingPractice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🎤 Speaking Practice</span>
              <Button 
                onClick={() => setShowSpeakingPractice(false)}
                variant="outline"
                size="sm"
              >
                Close Practice
              </Button>
            </CardTitle>
            <CardDescription>
              Practice pronunciation with AI-powered feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpeakingPractice
              targetSentence={currentPracticeSentence}
              sentenceMeaning={getCurrentPracticeSentenceMeaning()}
              language={targetLanguage}
              difficulty={difficultyLevel.toLowerCase() as 'beginner' | 'intermediate' | 'advanced'}
              onPracticeComplete={handlePracticeComplete}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Your Sessions</CardTitle>
            <CardDescription>API: GET /api/sessions | Click to select and manage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No sessions found.</p>
                  <p className="text-sm text-gray-400">Start a new session to begin practicing!</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => selectSession(session)}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      currentSession?.id === session.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {LANGUAGES.find(l => l.code === session.target_language)?.name || session.target_language}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded capitalize">
                            {session.difficulty_level}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Progress: {session.completed_turns || 0} / {session.total_turns || 0} turns
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ID: {session.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          session.ended_at ? 'bg-green-100 text-green-700' : 
                          session.started_at ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {getSessionStatus(session)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(session.created_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Session Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentSession ? '🎯 Active Session Details' : '👋 Select a Session'}
            </CardTitle>
            {currentSession && (
              <CardDescription>
                Session ID: {currentSession.id.slice(0, 8)}... | API: GET /api/sessions/{currentSession.id}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {currentSession ? (
              <div className="space-y-4">
                {/* Session Info */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Session Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Language:</span>
                      <span className="ml-2 font-medium">
                        {LANGUAGES.find(l => l.code === currentSession.target_language)?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Level:</span>
                      <span className="ml-2 font-medium capitalize">{currentSession.difficulty_level}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 font-medium">{getSessionStatus(currentSession)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Progress:</span>
                      <span className="ml-2 font-medium">
                        {((currentSession.completed_turns || 0) / Math.max(currentSession.total_turns || 1, 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => fetchSpecificSession(currentSession.id)} 
                    disabled={loading}
                    size="sm"
                    variant="outline"
                  >
                    🔄 Refresh Session
                  </Button>
                  <Button 
                    onClick={() => fetchTurns(currentSession.id)} 
                    disabled={loading}
                    size="sm"
                    variant="outline"
                  >
                    🔄 Refresh Turns
                  </Button>
                </div>

                <Separator />

                {/* Turns Management */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">🔄 Learning Turns</h4>
                    <span className="text-xs text-gray-500">
                      API: Turns endpoints
                    </span>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {turns.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No turns yet. Add a practice turn to start learning!
                      </div>
                    ) : (
                      turns.map(turn => (
                        <div key={turn.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Turn {turn.turn_number}</span>
                                <button
                                  onClick={() => fetchSpecificTurn(currentSession.id, turn.id)}
                                  className="text-xs text-blue-600 hover:underline"
                                  title="API: GET /api/sessions/[sessionId]/turns/[turnId]"
                                >
                                  🔍 Fetch Details
                                </button>
                              </div>
                              <p className="text-sm font-medium mt-1">{turn.target_sentence}</p>
                              <p className="text-xs text-gray-600">{turn.sentence_meaning}</p>
                            </div>
                            <div className="text-right ml-4">
                              {turn.turn_completed ? (
                                <div className="space-y-1">
                                  <span className="text-xs text-green-600 font-medium">✓ Completed</span>
                                  {turn.pronunciation_feedback_json && (
                                    <p className="text-xs">
                                      Score: {(turn.pronunciation_feedback_json as any).overall_score}%
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <Button 
                                  size="sm" 
                                  onClick={() => completeTurn(turn.id, turn.target_sentence)}
                                  disabled={loading}
                                >
                                  🎯 Complete Turn
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* User input for incomplete turns */}
                          {!turn.turn_completed && (
                            <div className="mt-2">
                              <Input
                                placeholder="Type your response here (optional)..."
                                value={userTranscript}
                                onChange={(e) => setUserTranscript(e.target.value)}
                                className="text-sm"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    completeTurn(turn.id, turn.target_sentence, userTranscript);
                                  }
                                }}
                              />
                            </div>
                          )}

                          {/* Turn results */}
                          {turn.user_transcript && (
                            <div className="text-xs bg-gray-50 p-2 rounded">
                              <p><strong>Your Response:</strong> {turn.user_transcript}</p>
                              {turn.pronunciation_feedback_json && (
                                <p><strong>Feedback:</strong> {(turn.pronunciation_feedback_json as any).feedback}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Select a session from the list to view details.</p>
                <p className="text-sm text-gray-400 mt-2">You can manage turns and complete sessions here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Call Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle>📡 API Call Monitor</CardTitle>
          <CardDescription>Live tracking of all API endpoint calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Last API Call:</strong> 
              <span className="ml-2 font-mono text-blue-600">{lastApiCall || 'None'}</span>
            </div>
            <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs font-mono">
              {apiCallHistory.length === 0 ? (
                <p className="text-gray-500">API call history will appear here...</p>
              ) : (
                apiCallHistory.map((call, index) => (
                  <div key={index} className="py-1">{call}</div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints Status */}
      <Card>
        <CardHeader>
          <CardTitle>🛠️ API Endpoints Reference</CardTitle>
          <CardDescription>All implemented session management endpoints with their usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ POST /api/sessions</p>
              <p className="text-xs text-green-600">Create new session (Start New Session button)</p>
            </div>
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ GET /api/sessions</p>
              <p className="text-xs text-green-600">Fetch all sessions (Sessions list)</p>
            </div>
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ GET /api/sessions/:id</p>
              <p className="text-xs text-green-600">Get specific session (Refresh Session)</p>
            </div>
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ PATCH /api/sessions/:id</p>
              <p className="text-xs text-green-600">Update session (Update Difficulty)</p>
            </div>
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ POST /api/sessions/:id/complete</p>
              <p className="text-xs text-green-600">Complete session (End Session button)</p>
            </div>
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ POST /api/sessions/:id/turns</p>
              <p className="text-xs text-green-600">Create turn (Add Practice Turn)</p>
            </div>
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ GET /api/sessions/:id/turns</p>
              <p className="text-xs text-green-600">Get session turns (Refresh Turns)</p>
            </div>
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ GET /api/sessions/:id/turns/:id</p>
              <p className="text-xs text-green-600">Get specific turn (Fetch Details)</p>
            </div>
            <div className="space-y-1 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-700">✅ PATCH /api/sessions/:id/turns/:id</p>
              <p className="text-xs text-green-600">Update turn (Complete Turn)</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-700 mb-2">🧪 How to Test:</h4>
            <ol className="text-sm text-blue-600 space-y-1">
              <li>1. <strong>Start Session:</strong> Select language/difficulty and click "Start New Session"</li>
              <li>2. <strong>Practice:</strong> Click "Add Practice Turn" to create learning exercises</li>
              <li>3. <strong>Complete Turns:</strong> Type responses or use auto-complete for each turn</li>
              <li>4. <strong>Auto Mode:</strong> Use "Start Auto Practice" for continuous turn creation/completion</li>
              <li>5. <strong>Update Session:</strong> Change difficulty level while session is active</li>
              <li>6. <strong>End Session:</strong> Click "End Session" to complete and see summary</li>
              <li>7. <strong>Monitor:</strong> Watch API calls in real-time and check browser console for detailed logs</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}