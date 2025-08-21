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
3. Run the SQL migration in `sql/001_init_tables.sql` in your Supabase SQL editor
4. Configure authentication providers in the Supabase dashboard:
   - Go to Authentication > Providers
   - Enable Email and Google (if you want OAuth)
   - Set redirect URLs to include `http://localhost:3000/*` for development

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
src/
├── app/                  # App Router pages and API routes
│   ├── api/             # API endpoints
│   │   ├── health/      # Health check endpoint
│   │   ├── protected/   # Protected API example
│   │   └── users/       # User management APIs
│   ├── dashboard/       # Protected dashboard page
│   ├── login/          # Sign in page
│   ├── signup/         # Sign up page
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout with AuthProvider
│   └── page.tsx        # Landing page
├── context/            # React contexts (Auth)
└── lib/               # Utilities (Supabase clients, auth verification)
sql/                   # Database schema and migrations
```

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).
