import { NextRequest, NextResponse } from 'next/server';
import { AudioSynthesisRequest } from '@/types/audio.types';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: AudioSynthesisRequest = await request.json();
    
    // Validate required fields
    if (!body.text || !body.language) {
      return NextResponse.json(
        { error: 'Text and language are required' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare OpenAI TTS request
    const ttsRequest = {
      model: 'tts-1',
      input: body.text,
      voice: body.voice || 'alloy',
      response_format: 'mp3',
      speed: body.speed || 1.0
    };

    // Call OpenAI TTS API
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ttsRequest),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI TTS error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate audio from OpenAI' },
        { status: openaiResponse.status }
      );
    }

    // Get audio data as array buffer
    const audioBuffer = await openaiResponse.arrayBuffer();
    
    // Convert to base64 for storage/transmission
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    // For now, we'll return the base64 data
    // In production, you might want to store this in a CDN or cloud storage
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
    
    // Estimate duration (rough calculation based on text length and speed)
    const estimatedDuration = Math.ceil(body.text.length / (body.speed || 1.0) / 10);

    return NextResponse.json({
      audioUrl,
      duration: estimatedDuration,
      format: 'mp3',
      metadata: {
        language: body.language,
        voice: body.voice || 'alloy',
        speed: body.speed || 1.0,
        quality: body.quality || 'high'
      }
    });

  } catch (error) {
    console.error('Audio synthesis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Audio synthesis endpoint',
    supportedVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    supportedFormats: ['mp3'],
    supportedSpeeds: [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
  });
} 