# Chatterly

A modern language learning application built with Next.js 14, TypeScript, Tailwind CSS, and Supabase. Chatterly provides an interactive platform for users to practice and improve their language skills through structured learning sessions with real-time feedback on pronunciation and grammar.

## Features

- ✅ **Authentication System**
  - Email/password authentication with display name
  - OAuth with Google
  - Protected routes with row-level security (RLS)
  - Automatic user profile creation via database triggers

- ✅ **Language Learning Platform**
  - Interactive learning sessions with turn-based practice
  - Multi-language support (Spanish, French, German, Italian, Portuguese)
  - Difficulty level progression (Beginner → Intermediate → Advanced)
  - Real-time pronunciation and grammar feedback
  - Session progress tracking and completion analytics

- ✅ **Sentence Bank System**
  - Curated sentence collections by language and difficulty
  - Category-based organization (greetings, travel, food, etc.)
  - Random sentence selection for varied practice
  - RESTful API for sentence management

- ✅ **User Management**
  - User profiles with preferences and settings
  - Progress tracking and achievement badges
  - Session history and statistics
  - Modern responsive UI with shadcn/ui components

## Project Structure

```
.
├── components.json                 # shadcn/ui configuration
├── next.config.ts                 # Next.js configuration  
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── specs/                         # Project specifications and requirements
│   ├── auth/                     # Authentication requirements
│   ├── sentence_bank/            # Sentence bank feature specs
│   └── sessions/                 # Session management specs
├── sql/                          # Database schema and migrations
│   ├── 001_init_tables.sql      # Core tables (users, profiles, settings)
│   ├── 002_learning_system_tables.sql # Learning system (sessions, turns, badges)
│   └── 003_sentence_bank.sql    # Sentence bank with constraints and RPC
└── src/
    ├── app/                      # Next.js App Router
    │   ├── api/                 # API endpoints
    │   │   ├── health/          # Health check
    │   │   ├── sentences/       # Sentence bank API
    │   │   ├── sessions/        # Session management API
    │   │   └── users/           # User management API
    │   ├── auth/                # Authentication pages
    │   ├── dashboard/           # Protected dashboard
    │   ├── login/               # Sign in page
    │   ├── sessions/            # Session management interface
    │   ├── signup/              # Sign up page
    │   └── layout.tsx           # Root layout with AuthProvider
    ├── components/              # Reusable UI components
    │   └── ui/                  # shadcn/ui components
    ├── context/                 # React contexts (AuthContext)
    ├── lib/                     # Utility libraries
    │   ├── errorHandling.ts     # Centralized error handling
    │   ├── supabaseClient.ts    # Browser Supabase client
    │   ├── supabaseServer.ts    # Server Supabase client
    │   ├── supabaseAdmin.ts     # Admin Supabase client
    │   └── verifySupabaseAuth.ts # Auth verification utilities
    └── types/                   # TypeScript type definitions
        ├── database.types.ts    # Generated Supabase types
        └── session.types.ts     # Session and learning types
```

## API Routes

### Core APIs
- `GET /api` - API status and health check
- `GET /api/health` - Detailed health check with environment info

### Authentication & Users
- `POST /api/users/ensure` - User profile creation and verification

### Sentence Bank Management
- `GET /api/sentences` - Fetch sentences with filtering by language, difficulty, category
- `POST /api/sentences` - Create new sentences (development only)
- `GET /api/sentences/[id]` - Get specific sentence by ID

### Session Management (Learning System)
- `GET /api/sessions` - Fetch all user sessions with optional filtering
- `POST /api/sessions` - Create new learning session
- `GET /api/sessions/[sessionId]` - Get specific session details
- `PATCH /api/sessions/[sessionId]` - Update session (difficulty, metadata)
- `POST /api/sessions/[sessionId]/complete` - Complete session with analytics

### Learning Turns (Practice Exercises)
- `GET /api/sessions/[sessionId]/turns` - Get all turns for a session
- `POST /api/sessions/[sessionId]/turns` - Create new practice turn
- `GET /api/sessions/[sessionId]/turns/[turnId]` - Get specific turn details
- `PATCH /api/sessions/[sessionId]/turns/[turnId]` - Update turn with user response and feedback

## Database Schema

### Core Tables
- **users** - User profiles extending Supabase auth.users
- **profiles** - User preferences and learning settings  
- **settings** - App settings and onboarding status

### Learning System
- **sessions** - Language learning sessions with progress tracking
- **learning_turns** - Individual practice exercises within sessions
- **sentence_bank** - Curated sentences for practice by language/difficulty
- **badges** - User achievements and progress milestones

### Key Features
- **Row-Level Security (RLS)** - All tables secured with user-based policies
- **Database Triggers** - Automatic profile creation on user signup
- **JSON Storage** - Flexible feedback and progress data in JSONB columns
- **Constraints & Indexes** - Optimized for fast sentence selection and filtering

## Pages

- `/` - Landing page with app overview
- `/login` - Sign in page with email/password and OAuth
- `/signup` - Sign up page with display name field
- `/dashboard` - Protected dashboard with user overview
- `/sessions` - Interactive session management and practice interface
- `/auth/confirm` - Email confirmation page

## Session Management Demo

The `/sessions` page provides a comprehensive testing interface for all session management features:

- **Session Lifecycle**: Create → Practice → Complete sessions
- **Turn Management**: Add practice turns with realistic language sentences
- **Real-time Feedback**: Simulated pronunciation and grammar scoring
- **API Monitoring**: Live tracking of all API calls with detailed logging
- **Multi-language Support**: Practice with Spanish, French, German, Italian, and Portuguese

## Development

### Prerequisites
- Node.js 18+ and npm
- Supabase project with environment variables configured
- Database migrated with provided SQL files

### Getting Started
```bash
npm install
npm run dev
```

### Environment Variables
Required environment variables for Supabase integration:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Backend**: Next.js API Routes with comprehensive error handling
- **Database**: Supabase (PostgreSQL) with RLS and real-time subscriptions
- **Authentication**: Supabase Auth with social providers
- **Validation**: Zod for runtime type validation
- **Deployment**: Optimized for Vercel deployment