import { Database } from '@/types/database.types';
import OpenAI from 'openai';

// Type for sentence from the sentence bank
type SentenceBankRow = Database['public']['Tables']['sentence_bank']['Row'];

// Request interface for teaching mode
export interface TeachingRequest {
  language: string;
  difficulty: string;
  authToken: string;
  turnNumber?: number;
  sessionContext?: {
    previousSentences?: string[];
    userProgress?: string;
  };
  requestType?: 'explanation' | 'feedback';
  userInput?: {
    transcript?: string;
    confidenceScore?: number;
    pronunciationScore?: number;
    targetSentence?: string;
  };
}

// Response interface for teaching mode
export interface TeachingResponse {
  success: boolean;
  data?: {
    sentence: string;
    pronunciation: string;
    meaning: string;
    teaching_explanation: string;
    encouragement: string;
    feedback?: string; // For user feedback responses
    nextSentenceReady?: boolean; // Indicates if user is ready for next sentence
  };
  error?: string;
}

// Use OpenAI's built-in Response type

// Difficulty-specific teaching guidelines
const DIFFICULTY_GUIDELINES = {
  beginner: {
    explanation: "Focus on basic vocabulary and simple grammar patterns. Break down complex words into syllables.",
    encouragement: "You're doing great! Every new word is a step forward in your language journey."
  },
  intermediate: {
    explanation: "Explain grammar structures and provide context about when to use this phrase. Include cultural notes when relevant.",
    encouragement: "Excellent progress! You're building a solid foundation in the language."
  },
  advanced: {
    explanation: "Discuss nuanced meanings, idiomatic usage, and cultural context. Compare with similar expressions.",
    encouragement: "Impressive! You're developing real fluency and cultural understanding."
  }
};

// Enhanced teaching prompt template with session context
const createTeachingPrompt = (
  language: string, 
  difficulty: string, 
  sentence: string,
  requestType: 'explanation' | 'feedback' = 'explanation',
  turnNumber?: number, 
  sessionContext?: any,
  userInput?: {
    transcript?: string;
    confidenceScore?: number;
    pronunciationScore?: number;
    targetSentence?: string;
  }
) => {
  const difficultyGuide = DIFFICULTY_GUIDELINES[difficulty as keyof typeof DIFFICULTY_GUIDELINES] || DIFFICULTY_GUIDELINES.beginner;
  
  if (requestType === 'explanation') {
    const explanationPrompt = `You are an English-speaking language tutor teaching ${language} to English speakers. You will provide a brief teaching explanation ENTIRELY IN ENGLISH for a sentence in the target language.

Target Language: ${language}
Difficulty Level: ${difficulty}
Sentence to teach: ${sentence}
${turnNumber ? `Turn Number: ${turnNumber}` : ''}
${sessionContext?.previousSentences?.length ? `Previous sentences in this session: ${sessionContext.previousSentences.join(', ')}` : ''}

CRITICAL: Your response MUST be written completely in ENGLISH. Do not write any words in ${language} except when quoting the sentence being taught. This is for English-speaking students learning ${language}.

IMPORTANT: Respond with ONLY plain text. Do not use JSON, markdown formatting, code blocks, or any other structured format.

Please provide a brief teaching explanation IN ENGLISH that covers:
- Grammar structures and usage patterns
- Cultural context when relevant
- Practical usage tips
- Any interesting linguistic notes

Teaching Guidelines for ${difficulty} level:
${difficultyGuide.explanation}

General Guidelines:
- Keep explanations simple and encouraging (2-3 sentences)
- Focus on practical usage and real-world application
- Use positive, supportive language
- Make it appropriate for ${difficulty} level learners
- Write your ENTIRE explanation in English only
${turnNumber && turnNumber > 1 ? '- Reference previous learning when appropriate to create continuity' : ''}
${sessionContext?.previousSentences?.length ? '- Avoid repeating explanations from previous sentences in this session' : ''}

Remember: Respond only in English. Your explanation should help English speakers understand the ${language} sentence.`;

    return explanationPrompt;
  } else {
    // Feedback mode
    const feedbackPrompt = `You are a friendly and encouraging language tutor providing personalized feedback on a student's pronunciation attempt.

Target Language: ${language}
Difficulty Level: ${difficulty}
Target Sentence: ${userInput?.targetSentence || sentence}
Student's Spoken Response: ${userInput?.transcript || 'No transcript available'}
Pronunciation Confidence Score: ${userInput?.confidenceScore || 'Not available'}%
Overall Pronunciation Score: ${userInput?.pronunciationScore || 'Not available'}%

CRITICAL REQUIREMENT: You MUST provide ALL feedback in ENGLISH ONLY. Never respond in ${language} or any other language - always use English for your feedback to help the student understand your guidance.

IMPORTANT: Respond with ONLY plain text. Do not use JSON, markdown formatting, code blocks, or any other structured format.

Provide encouraging and constructive feedback IN ENGLISH that includes:
- Acknowledge their effort and progress
- Highlight what they did well
- Provide specific suggestions for improvement based on the scores
- Encourage continued practice
- Mention if they're ready for the next sentence (if pronunciation score > 70%)

Feedback Guidelines for ${difficulty} level:
${difficultyGuide.encouragement}

General Guidelines:
- Be positive and supportive, even with low scores
- Give specific, actionable advice
- Use simple English appropriate for ${difficulty} level learners
- Keep feedback concise but meaningful (2-4 sentences)
- Always end on an encouraging note
- REMEMBER: Write your entire response in English, not in ${language}

Provide only the personalized feedback as plain text IN ENGLISH.`;

    return feedbackPrompt;
  }
};

// Simplified fallback teaching explanations for different languages
const FALLBACK_EXPLANATIONS: Record<string, string> = {
  es: "This is a common greeting in Spanish. The phrase 'Hola' is informal and friendly, while '¿cómo estás?' asks about someone's wellbeing. Use this with friends, family, or in casual situations.",
  fr: "This is a polite greeting in French. 'Bonjour' is used during the day, and 'comment allez-vous?' is the formal way to ask how someone is doing. Use this in professional or formal situations.",
  de: "This is a formal greeting in German. 'Hallo' is a universal greeting, and 'wie geht es Ihnen?' is the polite form of asking how someone is. The 'Ihnen' shows respect and formality."
};

// Fallback response structure for errors
const createFallbackResponse = (language: string, sentence: string) => ({
  sentence: sentence,
  pronunciation: "Pronunciation guide unavailable",
  meaning: "Translation unavailable", 
  teaching_explanation: FALLBACK_EXPLANATIONS[language] || FALLBACK_EXPLANATIONS.es,
  encouragement: "Keep practicing! Every new phrase brings you closer to fluency."
});

// Default fallback explanation
const DEFAULT_FALLBACK_EXPLANATION = FALLBACK_EXPLANATIONS.es;

/**
 * Generates a teaching response by fetching a sentence and using AI to create educational content
 */
export async function generateTeachingResponse(request: TeachingRequest): Promise<TeachingResponse> {
  const { language, difficulty, authToken, turnNumber, sessionContext, requestType = 'explanation', userInput } = request;
  
  console.log(`🎓 TeachingMode: Processing ${requestType} request`, {
    language,
    difficulty,
    turnNumber,
    hasUserInput: !!userInput
  });

  // Validate required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set');
    const fallbackResponse = createFallbackResponse(language, "Hello, how are you?");
    return {
      success: false,
      error: 'AI service is not configured. Please try again later.',
      data: fallbackResponse
    };
  }

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    let selectedSentence: SentenceBankRow;
    
    if (requestType === 'feedback' && userInput?.targetSentence) {
      // For feedback requests, use the target sentence from user input
      selectedSentence = {
        sentence_text: userInput.targetSentence,
        meaning_english: 'Target sentence for feedback',
        pronunciation_guide: 'N/A for feedback',
        language,
        difficulty_level: difficulty,
        category: 'feedback',
        id: 'feedback-sentence',
        created_at: new Date().toISOString()
      };
      console.log(`🎓 TeachingMode: Using target sentence for feedback: ${selectedSentence.sentence_text}`);
    } else {
      // Step 1: Fetch sentence from existing /api/sentences endpoint
      // Use absolute URL for internal API calls
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const sentenceResponse = await fetch(`${baseUrl}/api/sentences?language=${language}&difficulty=${difficulty}&limit=1`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!sentenceResponse.ok) {
        throw new Error(`Failed to fetch sentence from sentence bank: ${sentenceResponse.status} ${sentenceResponse.statusText}`);
      }

      const sentences: SentenceBankRow[] = await sentenceResponse.json();
      
      if (!sentences || sentences.length === 0) {
          throw new Error('No sentences available for the specified criteria');
      }
      
      selectedSentence = sentences[0];
      console.log(`🎓 TeachingMode: Fetched new sentence: ${selectedSentence.sentence_text}`);
    }

    // Step 2: Prepare personalized teaching prompt with session context
    const prompt = createTeachingPrompt(
      language, 
      difficulty, 
      selectedSentence.sentence_text,
      requestType,
      turnNumber,
      sessionContext,
      userInput
    );

    // Step 3: Call OpenAI Chat Completions API with GPT-4o-mini
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user', 
          content: requestType === 'explanation' 
            ? `Please provide the teaching explanation for this sentence.`
            : `Please provide personalized feedback for the student's pronunciation attempt.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    if (!aiResponse.choices || aiResponse.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    const aiContent = aiResponse.choices[0].message?.content;
    console.log(`\n🟩 AI Response: ${aiContent}`);
    
    // Step 4: Clean the AI response and use it appropriately  
    const aiText = aiContent?.trim();
    
    if (!aiText) {
      throw new Error(`Empty ${requestType} response from AI`);
    }

    console.log(`🎓 TeachingMode: Generated ${requestType}:`, aiText);

    if (requestType === 'explanation') {
      // Create response with sentence details and AI-generated teaching explanation
      return {
        success: true,
        data: {
          sentence: selectedSentence.sentence_text,
          pronunciation: selectedSentence.pronunciation_guide || "Pronunciation guide unavailable",
          meaning: selectedSentence.meaning_english || "Translation unavailable",
          teaching_explanation: aiText,
          encouragement: "Great job! Keep practicing to improve your language skills."
        }
      };
    } else {
      // Create feedback response
      const isReadyForNext = (userInput?.pronunciationScore || 0) > 70;
      return {
        success: true,
        data: {
          sentence: selectedSentence.sentence_text,
          pronunciation: "N/A for feedback",
          meaning: "N/A for feedback",
          teaching_explanation: "N/A for feedback",
          encouragement: "Continue practicing!",
          feedback: aiText,
          nextSentenceReady: isReadyForNext
        }
      };
    }

  } catch (error) {
    console.error('Teaching mode error:', error);
    
    // Get appropriate fallback response for the language
    const fallbackResponse = createFallbackResponse(language, "Hello, how are you?");
    
    // Return fallback response to maintain user experience
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate teaching response. Please try again.',
      data: fallbackResponse
    };
  }
}