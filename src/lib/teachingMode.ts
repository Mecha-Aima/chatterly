import { Database } from '@/types/database.types';

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

// AI/ML API response interface
interface AIMLResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

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
const createTeachingPrompt = (language: string, difficulty: string, turnNumber?: number, sessionContext?: any) => {
  const difficultyGuide = DIFFICULTY_GUIDELINES[difficulty as keyof typeof DIFFICULTY_GUIDELINES] || DIFFICULTY_GUIDELINES.beginner;
  
  const basePrompt = `You are a friendly and encouraging language tutor. I will give you a sentence in a target language, and you should teach it to a student.

Target Language: ${language}
Difficulty Level: ${difficulty}
${turnNumber ? `Turn Number: ${turnNumber}` : ''}
${sessionContext?.previousSentences?.length ? `Previous sentences in this session: ${sessionContext.previousSentences.join(', ')}` : ''}

IMPORTANT: Respond with ONLY a valid JSON object. Do not use markdown formatting, code blocks, or any other text. Return raw JSON only.

Please respond with a JSON object containing exactly these fields:
- sentence: the original sentence (exactly as provided)
- pronunciation: clear phonetic guide for pronunciation using simple phonetic notation
- meaning: accurate English translation/meaning
- teaching_explanation: brief explanation of grammar, usage, or cultural context (2-3 sentences, appropriate for ${difficulty} level)
- encouragement: personalized motivational message for the student${turnNumber ? ` (this is turn ${turnNumber})` : ''}

Teaching Guidelines for ${difficulty} level:
${difficultyGuide.explanation}

General Guidelines:
- Keep explanations simple and encouraging
- Focus on practical usage and real-world application
- Use positive, supportive language
- For pronunciation, use simple phonetic notation that's easy to understand
${turnNumber && turnNumber > 1 ? '- Reference previous learning when appropriate to create continuity' : ''}
${sessionContext?.previousSentences?.length ? '- Avoid repeating explanations from previous sentences in this session' : ''}

Default encouragement style: ${difficultyGuide.encouragement}`;

  return basePrompt;
};

// Fallback responses for different languages
const FALLBACK_RESPONSES: Record<string, any> = {
  es: {
    sentence: "Hola, ¿cómo estás?",
    pronunciation: "OH-lah, KOH-moh ehs-TAHS",
    meaning: "Hello, how are you?",
    teaching_explanation: "This is a common greeting in Spanish. Use it to ask someone how they are doing.",
    encouragement: "Great choice! This is one of the most useful phrases to learn first."
  },
  fr: {
    sentence: "Bonjour, comment allez-vous?",
    pronunciation: "bon-ZHOOR, koh-mahn tah-lay VOO",
    meaning: "Hello, how are you?",
    teaching_explanation: "This is a polite greeting in French. Use it in formal situations.",
    encouragement: "Excellent! This is a fundamental French greeting."
  },
  de: {
    sentence: "Hallo, wie geht es Ihnen?",
    pronunciation: "HAH-loh, vee gayt es EE-nen",
    meaning: "Hello, how are you?",
    teaching_explanation: "This is a formal greeting in German. Use it when meeting someone new.",
    encouragement: "Wunderbar! This is a perfect German greeting to start with."
  },
  it: {
    sentence: "Ciao, come stai?",
    pronunciation: "chow, KOH-meh stah-ee",
    meaning: "Hello, how are you?",
    teaching_explanation: "This is a casual greeting in Italian. Use it with friends and family.",
    encouragement: "Bene! This is a wonderful Italian greeting to learn."
  },
  pt: {
    sentence: "Olá, como está?",
    pronunciation: "oh-LAH, KOH-moh ehs-TAH",
    meaning: "Hello, how are you?",
    teaching_explanation: "This is a common greeting in Portuguese. Use it in everyday conversations.",
    encouragement: "Ótimo! This is an essential Portuguese greeting."
  }
};

// Default fallback for unsupported languages
const DEFAULT_FALLBACK = FALLBACK_RESPONSES.es;

/**
 * Generates a teaching response by fetching a sentence and using AI to create educational content
 */
export async function generateTeachingResponse(request: TeachingRequest): Promise<TeachingResponse> {
  const { language, difficulty, authToken, turnNumber, sessionContext } = request;

  // Validate required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set');
    const fallbackResponse = FALLBACK_RESPONSES[language] || DEFAULT_FALLBACK;
    return {
      success: false,
      error: 'AI service is not configured. Please try again later.',
      data: fallbackResponse
    };
  }

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
      turnNumber,
      sessionContext
    );

    const user_prompt = `Sentence to teach: ${selectedSentence.sentence_text}`

    // Step 3: Call OpenAI API with GPT-4o-mini
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: user_prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI API call failed with status: ${aiResponse.status} ${aiResponse.statusText}. Response: ${errorText}`);
    }

    const aiData: AIMLResponse = await aiResponse.json();
    
    if (!aiData.choices || aiData.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    // Step 4: Parse AI response
    const aiContent = aiData.choices[0].message.content;
    console.log(`\n🟩 AI Response: ${aiContent}`)
    let teachingData;
    
    try {
      // Clean the AI response by removing markdown code blocks if present
      let cleanedContent = aiContent.trim();
      
      // Remove markdown code block formatting if present
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      teachingData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI response content:', aiContent);
      throw new Error('Invalid response format from AI');
    }

    // Step 5: Validate response structure
    if (!teachingData.sentence || !teachingData.pronunciation || !teachingData.meaning || 
        !teachingData.teaching_explanation || !teachingData.encouragement) {
      throw new Error('Incomplete teaching response from AI');
    }

    return {
      success: true,
      data: {
        sentence: teachingData.sentence,
        pronunciation: teachingData.pronunciation,
        meaning: teachingData.meaning,
        teaching_explanation: teachingData.teaching_explanation,
        encouragement: teachingData.encouragement
      }
    };

  } catch (error) {
    console.error('Teaching mode error:', error);
    
    // Get appropriate fallback response for the language
    const fallbackResponse = FALLBACK_RESPONSES[language] || DEFAULT_FALLBACK;
    
    // Return fallback response to maintain user experience
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate teaching response. Please try again.',
      data: fallbackResponse
    };
  }
}