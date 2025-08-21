# Tasks

---

# Project Setup & Auth — Step-by-step tasks

---

## 0. Repo & toolchain (quick)

0.1 Create repo and branch `feature/auth-setup`.

0.2 Add `.gitignore` (node_modules, .env.local).

0.3 Basic `README.md` with local dev env instructions (how to set `.env.local`).

---

## 1. Scaffold Next.js + TypeScript + Tailwind

1.1 Run: `npx create-next-app@latest --ts` (select minimal config).

1.2 Install dependencies:

- `npm i @supabase/supabase-js`
- `npm i tailwindcss postcss autoprefixer` + `npx tailwindcss init -p`
    
    1.3 Add Tailwind config and base styles (standard Tailwind setup).
    
    1.4 Add npm scripts:
    
- `dev`, `build`, `start`, `lint` in `package.json`.

**Outcome:** Next app runs `npm run dev` and pages show.

---

## 2. Environment variables (local)

2.1 Create `.env.local` with placeholders:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

```

2.2 Document that must **not** be committed `.env.local`.

**Outcome:** Variables present locally to test auth flows.

---

## 3. Supabase client utilities

3.1 Create `lib/supabaseClient.ts` (client for browser):

```tsx
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(url, anon);

```

3.2 Create `lib/supabaseServer.ts` (server-only for API routes):

```tsx
import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseServer = createClient(url, service);

```

**Outcome:** Single place to import supabase clients.

---

## 4. Pages & routes (UI + API)

> Use Next.js Pages Router (simpler for auth + API routes). Create these files:
> 

4.1 Pages (client UI)

- `pages/login.tsx` — email/password form + "Sign in with Google" button + magic link flow.
- `pages/signup.tsx` — email/password signup + terms checkbox.
- `pages/dashboard.tsx` — protected page (shows user info).
- `pages/_app.tsx` — wrap app with simple Auth context/provider (see 5).
- `pages/index.tsx` — landing page linking to login/signup.

4.2 API routes (server helpers)

- `pages/api/auth/session.ts` — (optional) return server-validated user info from cookie or from Authorization header.
- `pages/api/auth/set-cookie.ts` — exchange client-side session object (if using client signIn) and set an httpOnly cookie for server-side usage. (See acceptance tests.)
- `pages/api/health.ts` — returns `{ ok: true, env: "dev" }`.

**Outcome:** Basic pages exist and compile.

---

## 5. Auth state management (client)

5.1 Implement an `AuthContext` in `context/AuthContext.tsx` or simple hook `hooks/useAuth.tsx` that:

- Exposes `user`, `loading`, `signUp(email,password)`, `signIn(email,password)`, `signInWithProvider(provider)`, `signOut()`.
- Uses `supabase.auth` client listeners to keep state sync (e.g., `onAuthStateChange`).

5.2 Use `AuthContext` in `_app.tsx` to guard routes. Redirect unauthenticated users trying to access `/dashboard` to `/login`.

**Outcome:** Client can call `signUp` and `signIn` and `user` state is available.

---

## 6. Sign-up & sign-in flows (implementation details)

6.1 Email/password sign-up:

- UI calls `supabase.auth.signUp({ email, password })`.
- On success: call server API `/api/auth/set-cookie` with returned session to set secure cookie (optional; or rely on client session for API calls).
- Create `users` row (see DB tasks) via server API or DB trigger (see 8).

6.2 Email/password sign-in:

- UI calls `supabase.auth.signInWithPassword({ email, password })`.
- On success: call `/api/auth/set-cookie` to set httpOnly cookie for SSR API routes (if you want server-session parity).

6.3 OAuth sign-in:

- UI triggers `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: process.env.NEXT_PUBLIC_SITE_URL } })`.
- Ensure Supabase is configured with redirect URL in dashboard (dev: `http://localhost:3000/*`).

6.4 Magic link / password reset:

- Use `supabase.auth.signInWithOtp({ email })` for magic link.
- Use `supabase.auth.resetPasswordForEmail(email)` if separate.

**Outcome:** All core flows callable from UI.

---

## 7. Server-side token verification (API protection)

7.1 Implement helper `lib/verifySupabaseAuth.ts` for API routes:

- Read `Authorization` header `Bearer <token>` or cookie.
- Call `supabaseServer.auth.getUser(token)` (or use JWT verification) to return `user` or throw 401.

7.2 Protect critical API route example:

```tsx
// pages/api/protected.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { verifySupabaseAuth } from '../../lib/verifySupabaseAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await verifySupabaseAuth(req, res); // returns user or responds 401
  // proceed with user.id
  res.json({ ok: true, user });
}

```

**Outcome:** API routes can validate session server-side.

---

## 8. Database schema (SQL migration snippets)

---

### 1. `users`

Backs Supabase Auth. Holds app-specific fields (in addition to what Supabase stores).

```
table users {
  id: uuid                // primary key, matches Supabase auth.users.id
  email: string           // user’s email
  display_name: string?   // optional, from profile or OAuth
  avatar_url: string?     // optional, from profile or OAuth
  role: enum("user","admin") = "user"
  verified_at: timestamp? // set when email verification completes
  created_at: timestamp
}

```

---

### 2. `profiles`

Stores user-specific learning info.

```
table profiles {
  user_id: uuid           // foreign key → users.id
  preferred_language: string = "en"
  difficulty_level: string = "beginner"
  streak_start: date?     // optional, for tracking streaks
  timezone: string?       // optional, for scheduling or streak calc
  created_at: timestamp
}

```

---

### 3. `settings`

Stores user’s app configuration (separate from profile).

```
table settings {
  id: uuid
  user_id: uuid           // foreign key → users.id
  onboarding_complete: boolean = false
  notifications_enabled: boolean = true
  created_at: timestamp
}

```

---

### 4. `sessions` (from PRD — keep full domain schema, even if partially used now)

Represents a single language practice session.

```
table sessions {
  id: uuid
  user_id: uuid           // foreign key → users.id
  persona_id: uuid?       // foreign key → persona (optional in Phase 1)
  target_language: string
  session_start: timestamp
  session_end: timestamp?
  created_at: timestamp

```

---

### Notes

- All `user_id` references should be enforced so that **Row Level Security (RLS)** can apply: `auth.uid() = user_id`.
- For **Phase 1**, the coding agent only needs to **insert** into `users`, `profiles`, and `settings` at sign-up, and **validate ownership** on `sessions`.

---

## 10. First-login defaults (create profiles/settings)

10.1 Two possible options (pick one and implement):

- A. **Server API create**: After successful sign-up/sign-in, call a server API `/api/users/ensure` which checks if `profiles`/`settings` exist for `auth.uid()` and inserts defaults if missing.
- B. **DB trigger**: Create a Postgres function/trigger on `auth.users` insert to populate `profiles` and `settings`.

10.2 Example API approach (A):

- `/api/users/ensure` reads `user` from token, `INSERT ... ON CONFLICT DO NOTHING` into `profiles` and `settings`.

**Outcome:** New users have baseline `profiles` and `settings`.

---

## 12. Deliverables & filenames (what to hand over)

- `lib/supabaseClient.ts`, `lib/supabaseServer.ts`, `lib/verifySupabaseAuth.ts`
- `context/AuthContext.tsx` (or `hooks/useAuth.tsx`)
- `pages/login.tsx`, `pages/signup.tsx`, `pages/dashboard.tsx`, `pages/api/health.ts`, `pages/api/auth/set-cookie.ts`, `pages/api/protected.ts`
- `sql/001_init_tables.sql` (contains schema + RLS policies)
- `README.md` — how to run locally and how to populate `.env.local`

---

## 13. Small implementation notes / constraints

- Use `NEXT_PUBLIC_` prefix only for safe-to-expose keys.
- Keep auth flows idempotent (user creation must be safe to call multiple times).
- Keep error messages helpful and return appropriate HTTP statuses (401, 403, 400).