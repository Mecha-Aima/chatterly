# Implementation Plan

- [x] 1. Create simple teaching mode function
  - Create `generateTeachingResponse` function in `src/lib/teachingMode.ts`
  - Function fetches sentence from existing `/api/sentences` endpoint
  - Makes single AI/ML API call to GPT-4o with teaching prompt
  - Returns structured response with sentence, pronunciation, meaning, and encouragement
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Add AI/ML API integration
  - Add `AIML_API_KEY` environment variable to `.env.local`
  - Create simple fetch call to `https://api.aimlapi.com/v1/chat/completions`
  - Use GPT-4o model with structured teaching prompt template
  - Handle basic error responses and return fallback content if API fails
  - _Requirements: 1.3, 4.1, 4.2_

- [x] 3. Create teaching prompt template
  - Design single prompt template that generates teaching response in JSON format
  - Include sentence text, pronunciation guide, meaning explanation, and practice encouragement
  - Template uses session context (language, difficulty, turn number) for personalization
  - Keep prompt simple and focused on core teaching functionality
  - _Requirements: 3.1, 3.2, 7.1_

- [x] 4. Add teaching mode to sessions page
  - Call `generateTeachingResponse` function when "Start Session" button is clicked
  - Display teaching response in simple card format below session controls
  - Show loading state during API call and error message if request fails
  - _Requirements: 5.1, 5.2, 4.4_

- [ ] 5. Create basic TypeScript interfaces
  - Define `TeachingRequest` and `TeachingResponse` interfaces as defined in the designs spec
  - Add types for AI/ML API request and response structures (also defined in design specs)
  - Keep type definitions minimal and focused on essential data
  - _Requirements: 4.1, 4.3_

- [ ] 6. Test and refine the integration
  - Test teaching mode with different languages and difficulty levels
  - Verify AI responses are properly formatted and educational
  - Ensure error handling works when API is unavailable
  - Refine prompt template based on response quality
  - _Requirements: 1.4, 6.1, 6.2_