-- Migration: Sentence bank constraints, indexes, and RPC for selection
-- Note: Table `sentence_bank` already exists (created in 002). This migration aligns it with the spec.

-- 1) Integrity constraints
-- Ensure 2-letter ISO code for language
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sentence_bank_language_iso2_check'
  ) THEN
    ALTER TABLE sentence_bank
      ADD CONSTRAINT sentence_bank_language_iso2_check
      CHECK (char_length(language) = 2);
  END IF;
END$$;

-- Ensure difficulty_level is one of allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sentence_bank_difficulty_check'
  ) THEN
    ALTER TABLE sentence_bank
      ADD CONSTRAINT sentence_bank_difficulty_check
      CHECK (difficulty_level IN ('beginner','intermediate','advanced'));
  END IF;
END$$;

-- Make pronunciation_guide and category NOT NULL per spec (if existing data is null, update or this will fail)
ALTER TABLE sentence_bank ALTER COLUMN pronunciation_guide SET NOT NULL;
ALTER TABLE sentence_bank ALTER COLUMN category SET NOT NULL;

-- Unique constraint to prevent duplicates per spec
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sentence_bank_unique_sentence'
  ) THEN
    ALTER TABLE sentence_bank
      ADD CONSTRAINT sentence_bank_unique_sentence
      UNIQUE (language, difficulty_level, sentence_text);
  END IF;
END$$;

-- 2) Index for fast filtering per spec
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_sentence_bank_lang_diff_cat'
  ) THEN
    CREATE INDEX idx_sentence_bank_lang_diff_cat ON sentence_bank(language, difficulty_level, category);
  END IF;
END$$;

-- 3) RPC: return random sentences with optional category and limit
-- Orders by RANDOM() (DB-level) and applies limit when provided.
CREATE OR REPLACE FUNCTION public.get_sentences(
  p_language TEXT,
  p_difficulty TEXT,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT NULL
)
RETURNS SETOF sentence_bank
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_limit IS NULL THEN
    RETURN QUERY
    SELECT * FROM sentence_bank
    WHERE language = p_language
      AND difficulty_level = p_difficulty
      AND (p_category IS NULL OR category = p_category)
    ORDER BY RANDOM();
  ELSE
    RETURN QUERY
    SELECT * FROM sentence_bank
    WHERE language = p_language
      AND difficulty_level = p_difficulty
      AND (p_category IS NULL OR category = p_category)
    ORDER BY RANDOM()
    LIMIT p_limit;
  END IF;
END;
$$;

-- Fallback RPC: get sentences by language regardless of difficulty, optional limit
CREATE OR REPLACE FUNCTION public.get_sentences_by_language(
  p_language TEXT,
  p_limit INT DEFAULT NULL
)
RETURNS SETOF sentence_bank
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM sentence_bank
  WHERE language = p_language
  ORDER BY RANDOM()
  LIMIT CASE WHEN p_limit IS NULL THEN ALL ELSE p_limit END;
$$;
