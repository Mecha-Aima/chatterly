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
  turnNumber?: number, 
  sessionContext?: any
) => {
  const difficultyGuide = DIFFICULTY_GUIDELINES[difficulty as keyof typeof DIFFICULTY_GUIDELINES] || DIFFICULTY_GUIDELINES.beginner;
  
  const basePrompt = `You are a friendly and encouraging language tutor. You will provide a brief teaching explanation for a sentence in a target language.

Target Language: ${language}
Difficulty Level: ${difficulty}
Sentence to teach: ${sentence}
${turnNumber ? `Turn Number: ${turnNumber}` : ''}
${sessionContext?.previousSentences?.length ? `Previous sentences in this session: ${sessionContext.previousSentences.join(', ')}` : ''}

IMPORTANT: Respond with ONLY plain text. Do not use JSON, markdown formatting, code blocks, or any other structured format.

Please provide a brief teaching explanation that covers:
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
${turnNumber && turnNumber > 1 ? '- Reference previous learning when appropriate to create continuity' : ''}
${sessionContext?.previousSentences?.length ? '- Avoid repeating explanations from previous sentences in this session' : ''}

Provide only the teaching explanation as plain text.`;

  return basePrompt;
};

// Simplified fallback teaching explanations for different languages
const FALLBACK_EXPLANATIONS: Record<string, string> = {
  es: "This is a common greeting in Spanish. The phrase 'Hola' is informal and friendly, while '¿cómo estás?' asks about someone's wellbeing. Use this with friends, family, or in casual situations.",
  fr: "This is a polite greeting in French. 'Bonjour' is used during the day, and 'comment allez-vous?' is the formal way to ask how someone is doing. Use this in professional or formal situations.",
  de: "This is a formal greeting in German. 'Hallo' is a universal greeting, and 'wie geht es Ihnen?' is the polite form of asking how someone is. The 'Ihnen' shows respect and formality.",
  it: "This is a casual greeting in Italian. 'Ciao' is very informal and friendly, while 'come stai?' asks how you are doing. Perfect for use with friends, family, or peers.",
  pt: "This is a common greeting in Portuguese. 'Olá' is a warm, friendly greeting, and 'como está?' asks about someone's state. This works well in most everyday conversations."
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
  const { language, difficulty, authToken, turnNumber, sessionContext } = request;

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
    
    const selectedSentence = sentences[0];
    console.log(`🟩 Fetched Sentence: ${selectedSentence.toString()}`)

    // Step 2: Prepare personalized teaching prompt with session context
    const prompt = createTeachingPrompt(
      language, 
      difficulty, 
      selectedSentence.sentence_text,
      turnNumber,
      sessionContext
    );

    const user_prompt = `Please provide the teaching explanation for this sentence.`

    // Step 3: Call OpenAI Responses API with GPT-4o-mini
    const aiResponse = await openai.responses.create({
      model: 'gpt-4o-mini',
      instructions: prompt,
      input: user_prompt,
      max_output_tokens: 500,
      temperature: 0.7,
    });

    if (aiResponse.status !== 'completed') {
      throw new Error(`OpenAI Responses API call failed with status: ${aiResponse.status}`);
    }

    if (!aiResponse.output || aiResponse.output.length === 0) {
      throw new Error('No response from OpenAI Responses API');
    }

    // Step 4: Parse OpenAI Responses API response
    const assistantMessage = aiResponse.output.find(item => 
      item.type === 'message' && 'role' in item && item.role === 'assistant'
    );
    
    if (!assistantMessage || assistantMessage.type !== 'message' || !('content' in assistantMessage)) {
      throw new Error('No assistant message found in response');
    }

    const textContent = assistantMessage.content.find((content: any) => content.type === 'output_text');
    if (!textContent || textContent.type !== 'output_text') {
      throw new Error('No text content found in assistant message');
    }

    const aiContent = (textContent as any).text;
    console.log(`\n🟩 AI Response: ${aiContent}`)
    
    // Step 5: Clean the AI response and use it as teaching explanation
    const teachingExplanation = aiContent.trim();
    
    if (!teachingExplanation) {
      throw new Error('Empty teaching explanation from AI');
    }

    // Create response with sentence details and AI-generated teaching explanation
    return {
      success: true,
      data: {
        sentence: selectedSentence.sentence_text,
        pronunciation: selectedSentence.pronunciation_guide || "Pronunciation guide unavailable",
        meaning: selectedSentence.meaning_english || "Translation unavailable",
        teaching_explanation: teachingExplanation,
        encouragement: "Great job! Keep practicing to improve your language skills."
      }
    };

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