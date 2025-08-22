# Chatterly

A modern chat application built with Next.js, TypeScript, Tailwind CSS, and Supabase authentication.

## Local Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the SQL migrations in order in your Supabase SQL editor:
   - `sql/001_init_tables.sql`
   - `sql/002_learning_system_tables.sql`
   - `sql/003_sentence_bank.sql`
   - `sql/005_fix_user_triggers.sql` (fixes signup database errors)
4. Configure authentication providers in the Supabase dashboard:
   - Go to Authentication > Providers
   - Enable Email and Google (if you want OAuth)
   - Go to Authentication > Settings
   - **Disable "Confirm email"** under Email configuration for immediate signup
   - Set redirect URLs to include `http://localhost:3000/*` for development

### Troubleshooting

If you get "Database error saving new user" during signup:

1. Run the diagnostic queries in `sql/diagnostic_queries.sql` in your Supabase SQL editor
2. Make sure you've applied `sql/005_fix_user_triggers.sql`
3. Check the browser console for detailed error messages
4. Ensure "Confirm email" is disabled in Authentication > Settings

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Features

- ✅ Email/password authentication
- ✅ OAuth with Google
- ✅ Magic link authentication
- ✅ Password reset
- ✅ Protected routes
- ✅ User profiles and settings
- ✅ Row-level security

### API Routes

- `/api/health` - Health check endpoint
- `/api/protected` - Example protected API route
- `/api/users/ensure` - Ensures user profile exists

### Pages

- `/` - Landing page
- `/login` - Sign in page
- `/signup` - Sign up page
- `/dashboard` - Protected dashboard (requires authentication)

## Project Structure

```
.
├── components.json
├── next.config.ts
├── package.json
├── postcss.config.js
├── tsconfig.json
├── README.md
├── specs/                   # Specs and tasks (e.g., auth requirements)
├── sql/                     # Database schema and migrations
│   ├── 001_init_tables.sql
│   └── 002_learning_system_tables.sql
└── src/
   ├── app/                 # App Router pages and API routes
   │   ├── api/             # API endpoints (health, protected, users/ensure)
   │   ├── dashboard/       # Protected dashboard page
   │   ├── login/           # Sign in page
   │   ├── signup/          # Sign up page
   │   ├── globals.css
   │   ├── layout.tsx       # Root layout with AuthProvider
   │   └── page.tsx         # Landing page
   ├── components/          # UI components (shadcn/ui wrappers)
   ├── context/             # React contexts (Auth)
   ├── features/            # Feature modules
   └── lib/                 # Supabase clients, utils, auth helpers
```

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).
