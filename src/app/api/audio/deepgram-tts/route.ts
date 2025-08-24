import { NextRequest, NextResponse } from 'next/server';

interface DeepgramTTSRequest {
  text: string;
  language?: string;
  model?: string;
  voice?: string;
  speed?: number;
}

interface DeepgramTTSResponse {
  audioUrl: string;
  duration?: number;
  format: string;
  metadata: {
    language: string;
    model: string;
    voice?: string;
    speed?: number;
  };
}

// Language to Deepgram model mapping
const LANGUAGE_MODEL_MAP: Record<string, string> = {
  'en': 'aura-2-thalia-en',
  'es': 'aura-2-luna-en', // Using English model for now, can be updated when Spanish models are available
  'fr': 'aura-2-thalia-en',
  'de': 'aura-2-thalia-en',
  'it': 'aura-2-thalia-en',
  'pt': 'aura-2-thalia-en',
  'default': 'aura-2-thalia-en'
};

export async function POST(request: NextRequest) {
  console.log('🔊 Deepgram TTS API: Request received');
  
  try {
    // Parse request body
    const body: DeepgramTTSRequest = await request.json();
    const { text, language = 'en', model, voice, speed = 1.0 } = body;

    console.log('🔊 Deepgram TTS: Processing request', {
      textLength: text?.length,
      language,
      model,
      voice,
      speed
    });

    // Validate required fields
    if (!text || text.trim().length === 0) {
      console.error('❌ Deepgram TTS: Text input is required');
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      );
    }

    // Check if Deepgram API key is configured
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      console.error('❌ Deepgram TTS: API key not configured');
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }

    // Determine the model to use
    const selectedModel = model || LANGUAGE_MODEL_MAP[language] || LANGUAGE_MODEL_MAP.default;
    
    // Build Deepgram API URL with query parameters
    const deepgramUrl = new URL('https://api.deepgram.com/v1/speak');
    deepgramUrl.searchParams.append('model', selectedModel);
    
    // Add optional parameters
    if (voice) {
      deepgramUrl.searchParams.append('voice', voice);
    }
    if (speed && speed !== 1.0) {
      deepgramUrl.searchParams.append('speed', speed.toString());
    }

    console.log('🔊 Deepgram TTS: Calling Deepgram API', {
      url: deepgramUrl.toString(),
      model: selectedModel,
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });

    // Call Deepgram TTS API
    const deepgramResponse = await fetch(deepgramUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!deepgramResponse.ok) {
      console.error('❌ Deepgram TTS: API call failed', {
        status: deepgramResponse.status,
        statusText: deepgramResponse.statusText
      });
      
      let errorMessage = 'Failed to generate audio from Deepgram';
      try {
        const errorData = await deepgramResponse.json();
        errorMessage = errorData.message || errorMessage;
        console.error('❌ Deepgram TTS: Error details', errorData);
      } catch (parseError) {
        console.error('❌ Deepgram TTS: Could not parse error response');
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: deepgramResponse.status }
      );
    }

    // Get audio data as array buffer
    const audioBuffer = await deepgramResponse.arrayBuffer();
    console.log('✅ Deepgram TTS: Audio generated successfully', {
      audioSize: audioBuffer.byteLength,
      sizeInKB: Math.round(audioBuffer.byteLength / 1024)
    });
    
    // Convert to base64 for JSON response (alternative approach)
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    // Estimate duration (rough calculation based on text length and speech rate)
    // Average speaking rate is about 150-160 words per minute
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = Math.ceil((wordCount / 150) * 60 / (speed || 1.0));

    const response: DeepgramTTSResponse = {
      audioUrl,
      duration: estimatedDuration,
      format: 'mp3',
      metadata: {
        language,
        model: selectedModel,
        voice,
        speed
      }
    };

    console.log('✅ Deepgram TTS: Response prepared', {
      audioUrlLength: audioUrl.length,
      estimatedDuration,
      metadata: response.metadata
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Deepgram TTS: Unexpected error', error);
    return NextResponse.json(
      { error: 'Internal server error during audio synthesis' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Deepgram TTS endpoint',
    supportedLanguages: Object.keys(LANGUAGE_MODEL_MAP).filter(lang => lang !== 'default'),
    availableModels: Object.values(LANGUAGE_MODEL_MAP),
    supportedFormats: ['mp3'],
    defaultModel: LANGUAGE_MODEL_MAP.default
  });
}
