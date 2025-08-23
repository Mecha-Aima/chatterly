# 🎤 Audio API Setup Guide for Chatterly

## **Required API Keys**

To use the speaking practice feature, you need to set up two API keys:

### **1. OpenAI API Key (for Text-to-Speech)**
- Go to [OpenAI Platform](https://platform.openai.com/api-keys)
- Create a new API key
- Copy the key (starts with `sk-`)

### **2. Deepgram API Key (for Speech-to-Text)**
- Go to [Deepgram Console](https://console.deepgram.com/)
- Sign up/Login and create a new project
- Generate an API key
- Copy the key (starts with `dg_`)

## **Environment Configuration**

### **Step 1: Create .env.local file**
Create a file named `.env.local` in your project root:

```bash
# Audio Synthesis & AI APIs
OPENAI_API_KEY=sk-your_openai_key_here
DEEPGRAM_API_KEY=dg_your_deepgram_key_here

# Existing Supabase config (keep these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Step 2: Restart your development server**
```bash
npm run dev
```

## **Testing the Setup**

### **1. Check API Status**
Visit: `http://localhost:3000/api/audio/test`

You should see:
```json
{
  "message": "Audio API Test Endpoint",
  "status": {
    "environment": {
      "openai": { "configured": true, "keyLength": 51 },
      "deepgram": { "configured": true, "keyLength": 40 }
    }
  }
}
```

### **2. Test Speaking Practice**
1. Go to `/sessions` page
2. Click "🎤 Start Speaking Practice"
3. Try recording a sentence
4. Check browser console for any errors

## **Troubleshooting**

### **Common Issues:**

#### **"Deepgram API key not configured"**
- Check that `.env.local` file exists
- Verify `DEEPGRAM_API_KEY` is set correctly
- Restart your dev server

#### **"Failed to transcribe audio"**
- Check microphone permissions in browser
- Verify Deepgram API key is valid
- Check browser console for detailed errors

#### **"OpenAI API key not configured"**
- Check that `OPENAI_API_KEY` is set in `.env.local`
- Verify the key starts with `sk-`
- Restart your dev server

### **Browser Console Debugging**
Open browser DevTools (F12) and check:
1. **Console tab** - for error messages
2. **Network tab** - for API call failures
3. **Application tab** - for microphone permissions

### **API Endpoints to Test**
- `GET /api/audio/test` - Check API configuration
- `POST /api/audio/synthesize` - Test OpenAI TTS
- `POST /api/audio/transcribe` - Test Deepgram ASR

## **Cost Information**

### **OpenAI TTS**
- $0.015 per 1K characters
- Very affordable for language learning

### **Deepgram ASR**
- $0.0049 per minute of audio
- Free tier available (200 hours/month)

## **Support**

If you're still having issues:
1. Check the browser console for errors
2. Verify your API keys are working
3. Test the `/api/audio/test` endpoint
4. Check microphone permissions in your browser
