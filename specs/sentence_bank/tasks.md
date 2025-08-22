# Sentence Bank Management – Implementation Tasks

## Dependencies

- **Supabase Postgres** (for schema + data integrity)
- **Supabase Storage** (not directly needed, but consistent with existing setup)
- **Supabase RLS** (for secure access control)
- **Next.js (App Router)** (API endpoints + UI integration)
- **shadcn/ui** (for frontend components)
- **Supabase JS client** (for queries from frontend and server routes)

---

## Prerequisites

- Supabase project already provisioned and connected (auth, storage, DB).
- `sessions` and `learning_turns` tables already implemented (per PRD).
- Environment variables for Supabase set in project.
- Schema migrations workflow set up under `/sql/`.

---

## Implementation Tasks

### 1. Database Schema & Integrity

- **Create `sentence_bank` table** in `/sql/003_sentence_bank.sql`:
    - `id TEXT PRIMARY KEY`
    - `language TEXT NOT NULL CHECK (char_length(language)=2)` (ISO 639-1)
    - `difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner','intermediate','advanced'))`
    - `sentence_text TEXT NOT NULL`
    - `meaning_english TEXT NOT NULL`
    - `pronunciation_guide TEXT NOT NULL`
    - `category TEXT NOT NULL`
- **Integrity constraints**:
    - UNIQUE(language, difficulty_level, sentence_text) to prevent duplicates.
    - CHECK constraint for category limited to allowed list.
- **Indexes**:
    - Index on `(language, difficulty_level, category)` for fast filtering.

### 2. Data Seeding & Loading

- **Seed scripts** under `/sql/seeds/sentence_bank_seed.sql`:
    - Minimum: 20 sentences per difficulty level per language.
    - Target: 30 sentences per difficulty level per language.
    - Distribute across categories.
- **Manual insertion support**:
    - Provide a CSV template (`/specs/sentence_bank_template.csv`) for quick population.
    - Implement simple script under `/src/lib/seed_sentence_bank.ts` to bulk insert.

### 3. API Layer (Next.js App Router)

Under `/src/app/api/sentences/`:

- **GET `/api/sentences`**
    - Query params: `language`, `difficulty`, optional `category`, optional `limit`.
    - Returns full sentence objects (all fields).
    - Random order when no `limit`.
- **GET `/api/sentences/[id]`**
    - Fetch single sentence by ID.
- **POST `/api/sentences`** (development only, behind auth check)
    - Insert new sentence entries manually during development.
- **Error handling**
    - Return `400` on invalid ISO code, difficulty, or category.
    - Return `200` with empty array if no sentences available.

### 4. Selection Logic

- **Filter sentences**:
    - By `language` + `difficulty` (mandatory).
    - Optionally `category`.
- **Random selection**:
    - DB-level `ORDER BY RANDOM()` with limit.
- **Fallback behavior**:
    - If not enough sentences found for given difficulty, return all available for language (log shortage event).

### 5. Integration with Session Flow

- **Session initialization (PRD §4.1)**:
    - When user starts session → backend selects sentences from `sentence_bank` according to chosen `language` + `difficulty`.
    - Store selected sentence IDs in `learning_turns.target_sentence`.
- **Consistency check**:
    - Ensure progression aligns with difficulty definition:
        - Beginner = basic vocab/grammar.
        - Intermediate = compound structures.
        - Advanced = idioms/complex structures.

### 6. RLS Policies & Access Control

- **Sentence bank is read-only for end-users**:
    - Enable SELECT for `authenticated` role.
    - Restrict INSERT/UPDATE/DELETE to `service_role`.
- **Testing policies** under `/sql/policies/003_sentence_bank_policies.sql`.

### 7. Performance Considerations

- **Index coverage** ensures queries ≤2 seconds.
- **Random ordering** acceptable for demo scale.
- No caching layer required beyond DB.

---

## Deliverables

1. SQL migration for `sentence_bank` + policies.
2. Seed dataset (minimum coverage).
3. API routes for sentence operations.
4. Integration with session orchestration logic.
5. QA validation scripts + test coverage.