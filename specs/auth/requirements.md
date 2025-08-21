# Phase 1 — Foundation & Infrastructure

---

## Partition 1: Project Setup & Authentication

### Ubiquitous requirements (always true)

- The system shall initialize a Next.js (latest stable) project with TypeScript, Tailwind, and API routes enabled.
- The system shall configure Supabase client with environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The system shall define pages for `/login`, `/signup`, `/dashboard`, and `/api/health`.
- The system shall implement a shared Supabase client utility for use in frontend and API routes.

---

### Event-driven requirements (when X happens, system shall Y)

- When a user submits a sign-up form (email + password), the system shall call Supabase Auth `signUp()` and create a corresponding `users` table row with default fields.
- When a user logs in (email + password), the system shall call Supabase Auth `signInWithPassword()` and establish a session accessible in Next.js.
- When a user signs in with an OAuth provider (e.g., Google), the system shall complete the Supabase OAuth flow and ensure a `users` row is present.
- When a user requests password reset, the system shall trigger Supabase Auth password reset email and process the callback to update credentials.
- When a user logs out, the system shall call Supabase `signOut()` and clear session state.

---

### State-driven requirements (while in state X, system shall Y)

- While a user is authenticated, the system shall provide access to protected routes (e.g., `/dashboard`) and deny access otherwise.
- While API routes are called with an invalid or missing JWT, the system shall return 401 Unauthorized.
- While a user is in their first authenticated session, the system shall insert default rows for `profiles` and `settings`.

---

### Optional requirements

- Where OAuth profile information is available, the system shall populate `users.display_name` and `users.avatar_url`.
- Where email verification is enabled, the system shall restrict access to `/dashboard` until verification is confirmed.

---

### Complex requirements (state + event combined)

- While a user is authenticated, when they sign in for the first time, the system shall create default entries in `profiles` (preferred_language, difficulty_level) and `settings`.
- While API routes are accessed, when a JWT is presented, the system shall verify `sub` matches `users.id` and enforce row-level security on Supabase tables.

---

### Minimum data model

- **users** (PK = `id` from Supabase Auth)
    - id, email, display_name, avatar_url, role, created_at
- **profiles**
    - user_id (FK), preferred_languages, difficulty_level
- **settings**
    - user_id (FK), onboarding_complete (bool), notifications_enabled (bool)