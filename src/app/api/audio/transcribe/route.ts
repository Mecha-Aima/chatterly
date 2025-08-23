import { NextRequest, NextResponse } from 'next/server';
import { AudioTranscriptionRequest, AudioTranscriptionResponse } from '@/types/audio.types';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: AudioTranscriptionRequest = await request.json();
    
    // Validate required fields
    if (!body.audioData || !body.language) {
      return NextResponse.json(
        { error: 'Audio data and language are required' },
        { status: 400 }
      );
    }

    // Check if Deepgram API key is configured
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      console.error('Deepgram API key not configured');
      return NextResponse.json(
        { 
          error: 'Deepgram API key not configured',
          solution: 'Please add DEEPGRAM_API_KEY to your .env.local file'
        },
        { status: 500 }
      );
    }

    console.log('Deepgram API key configured:', deepgramApiKey ? 'Yes' : 'No');

    // Prepare Deepgram API request options
    const options = {
      model: body.model || 'nova-2',
      language: body.language,
      punctuate: body.options?.punctuate ?? true,
      diarize: body.options?.diarize ?? false,
      smart_format: body.options?.smart_format ?? true,
      word_confidence: true,
      utterance_end_ms: 1000,
      interim_results: false
    };

    console.log('Deepgram request options:', options);

    // Build query parameters
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const deepgramUrl = `https://api.deepgram.com/v1/listen?${queryParams.toString()}`;

    // Convert base64 audio data to buffer
    const audioBuffer = Buffer.from(body.audioData, 'base64');

    // Determine content type based on audio format
    // Most browsers will send WebM audio, so default to that
    let contentType = 'audio/webm';
    
    // If we have a specific format hint, use it
    if (body.audioData.length > 0) {
      // Check if it's explicitly WAV format
      if (body.audioData.includes('wav') || body.audioData.includes('wave')) {
        contentType = 'audio/wav';
      }
    }

    console.log('Transcription request:', {
      language: body.language,
      model: body.model,
      audioSize: audioBuffer.length,
      contentType: contentType
    });

    // Call Deepgram API
    const deepgramResponse = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': contentType,
      },
      body: audioBuffer,
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('Deepgram API error:', {
        status: deepgramResponse.status,
        statusText: deepgramResponse.statusText,
        error: errorText,
        url: deepgramUrl,
        headers: Object.fromEntries(deepgramResponse.headers.entries())
      });
      
      let errorMessage = `Deepgram API error: ${deepgramResponse.status}`;
      if (deepgramResponse.status === 401) {
        errorMessage = 'Deepgram API key is invalid or missing';
      } else if (deepgramResponse.status === 400) {
        errorMessage = 'Invalid audio format or request parameters';
      } else if (deepgramResponse.status === 413) {
        errorMessage = 'Audio file is too large';
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: deepgramResponse.status }
      );
    }

    // Parse Deepgram response
    const deepgramData = await deepgramResponse.json();
    
    // Log the actual response for debugging
    console.log('Deepgram response structure:', JSON.stringify(deepgramData, null, 2));
    
    // Process and format the response
    const transcription = processDeepgramResponse(deepgramData, body.language);

    return NextResponse.json(transcription);

  } catch (error) {
    console.error('Audio transcription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process Deepgram API response into standardized format
 */
function processDeepgramResponse(response: any, language: string): AudioTranscriptionResponse {
  console.log('Processing Deepgram response:', JSON.stringify(response, null, 2));

  // Handle different response formats from Deepgram API
  let results = response.results;
  
  // Check if results is an object with channels directly (new format)
  if (response.results && response.results.channels) {
    results = [response.results];
  }
  
  if (!results || results.length === 0) {
    throw new Error('No transcription results received from Deepgram');
  }

  const result = results[0];
  
  // Validate the expected structure exists
  if (!result.channels || !result.channels[0] || !result.channels[0].alternatives || !result.channels[0].alternatives[0]) {
    console.error('Unexpected Deepgram response structure:', result);
    throw new Error('Invalid response structure from Deepgram API');
  }

  const transcript = result.channels[0].alternatives[0].transcript;
  const confidence = result.channels[0].alternatives[0].confidence;
  
  // Extract word-level confidence data
  const words: any[] = [];
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

export async function GET() {
  return NextResponse.json({
    message: 'Deepgram transcription endpoint',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt'],
    supportedModels: ['nova-2', 'nova', 'enhanced', 'base', 'base-nova', 'base-nova-2'],
    features: ['word_confidence', 'punctuate', 'diarize', 'smart_format']
  });
} 