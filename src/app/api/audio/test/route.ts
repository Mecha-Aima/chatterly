import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    
    const status = {
      timestamp: new Date().toISOString(),
      environment: {
        openai: {
          configured: !!openaiKey,
          keyLength: openaiKey ? openaiKey.length : 0
        },
        deepgram: {
          configured: !!deepgramKey,
          keyLength: deepgramKey ? deepgramKey.length : 0
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    return NextResponse.json({
      message: 'Audio API Test Endpoint',
      status,
      instructions: {
        setup: 'Add OPENAI_API_KEY and DEEPGRAM_API_KEY to .env.local',
        test: 'Use the speaking practice feature to test audio transcription'
      }
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { error: 'Test endpoint failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Test audio data processing
    if (body.testAudio) {
      const audioData = body.testAudio;
      const buffer = Buffer.from(audioData, 'base64');
      
      return NextResponse.json({
        message: 'Audio data test successful',
        audioInfo: {
          originalLength: audioData.length,
          bufferLength: buffer.length,
          isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(audioData)
        }
      });
    }

    return NextResponse.json({
      message: 'POST test endpoint',
      usage: 'Send { testAudio: "base64string" } to test audio processing'
    });

  } catch (error) {
    console.error('POST test error:', error);
    return NextResponse.json(
      { error: 'POST test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 