-- Migration: Add learning system tables and update sessions table
-- This file adds the learning_turns, sentence_bank tables and updates sessions table

-- First, let's update the existing sessions table to match the new requirements
-- Add new columns to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS difficulty_level TEXT,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_turns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_turns INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS session_transcript_json JSONB,
ADD COLUMN IF NOT EXISTS overall_progress_json JSONB;

-- Update persona_id to TEXT type (it was UUID before)
ALTER TABLE sessions ALTER COLUMN persona_id TYPE TEXT;

-- Rename session_start to started_at and session_end to ended_at for consistency
-- First add the new columns with data from old ones
UPDATE sessions SET started_at = session_start WHERE started_at IS NULL;
UPDATE sessions SET ended_at = session_end WHERE ended_at IS NULL;

-- Drop the old columns
ALTER TABLE sessions DROP COLUMN IF EXISTS session_start;
ALTER TABLE sessions DROP COLUMN IF EXISTS session_end;

-- Create learning_turns table
CREATE TABLE learning_turns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  turn_number INTEGER NOT NULL,
  target_sentence TEXT NOT NULL,
  sentence_meaning TEXT,
  user_transcript TEXT,
  pronunciation_feedback_json JSONB,
  grammar_feedback_json JSONB,
  turn_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for learning_turns
ALTER TABLE learning_turns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_turns (users can only access turns from their own sessions)
CREATE POLICY "Users can view own learning turns" ON learning_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = learning_turns.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create learning turns for own sessions" ON learning_turns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = learning_turns.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own learning turns" ON learning_turns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = learning_turns.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Create sentence_bank table
CREATE TABLE sentence_bank (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL, -- ISO code
  difficulty_level TEXT NOT NULL,
  sentence_text TEXT NOT NULL,
  meaning_english TEXT NOT NULL,
  pronunciation_guide TEXT,
  category TEXT, -- greetings, food, travel, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for sentence_bank (this is read-only for all authenticated users)
ALTER TABLE sentence_bank ENABLE ROW LEVEL SECURITY;

-- RLS Policy for sentence_bank (all authenticated users can read)
CREATE POLICY "Authenticated users can view sentence bank" ON sentence_bank
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create badges table to track user achievements
CREATE TABLE badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  badge_data JSONB, -- Additional data about the badge achievement
  UNIQUE(user_id, badge_type) -- Prevent duplicate badges of the same type
);

-- Enable RLS for badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges
CREATE POLICY "Users can view own badges" ON badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges" ON badges
  FOR INSERT WITH CHECK (true); -- This will be called by functions with elevated privileges

-- Create indexes for performance
CREATE INDEX idx_learning_turns_session_id ON learning_turns(session_id);
CREATE INDEX idx_learning_turns_turn_number ON learning_turns(session_id, turn_number);
CREATE INDEX idx_sentence_bank_language_difficulty ON sentence_bank(language, difficulty_level);
CREATE INDEX idx_sentence_bank_category ON sentence_bank(category);
CREATE INDEX idx_badges_user_id ON badges(user_id);
CREATE INDEX idx_badges_type ON badges(badge_type);
CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at);

-- Badge awarding functions
-- Function to check and award first_session badge
CREATE OR REPLACE FUNCTION award_first_session_badge()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the user's first session
  IF (SELECT COUNT(*) FROM sessions WHERE user_id = NEW.user_id) = 1 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'first_session', jsonb_build_object('session_id', NEW.id))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award perfect_pronunciation badge
CREATE OR REPLACE FUNCTION award_perfect_pronunciation_badge()
RETURNS TRIGGER AS $$
DECLARE
  pronunciation_score NUMERIC;
  session_user_id UUID;
BEGIN
  -- Extract pronunciation score from feedback JSON
  pronunciation_score := (NEW.pronunciation_feedback_json->>'overall_score')::NUMERIC;
  
  -- Get the user_id from the session
  SELECT user_id INTO session_user_id 
  FROM sessions 
  WHERE id = NEW.session_id;
  
  -- Award badge if pronunciation score > 90%
  IF pronunciation_score > 90 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (session_user_id, 'perfect_pronunciation', 
            jsonb_build_object('turn_id', NEW.id, 'score', pronunciation_score))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award 7_day_streak badge
CREATE OR REPLACE FUNCTION award_7_day_streak_badge()
RETURNS TRIGGER AS $$
DECLARE
  distinct_days INTEGER;
BEGIN
  -- Count distinct days with sessions in the last 7 days
  SELECT COUNT(DISTINCT DATE(started_at))
  INTO distinct_days
  FROM sessions 
  WHERE user_id = NEW.user_id 
    AND started_at >= NOW() - INTERVAL '7 days'
    AND started_at IS NOT NULL;
  
  -- Award badge if user has sessions on 7 distinct days
  IF distinct_days >= 7 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, '7_day_streak', 
            jsonb_build_object('streak_date', DATE(NEW.started_at)))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award sentences_mastered_50 badge
CREATE OR REPLACE FUNCTION award_sentences_mastered_badge()
RETURNS TRIGGER AS $$
DECLARE
  completed_sentences INTEGER;
  session_user_id UUID;
BEGIN
  -- Get the user_id from the session
  SELECT user_id INTO session_user_id 
  FROM sessions 
  WHERE id = NEW.session_id;
  
  -- Count completed turns with good scores (assuming >80% in both pronunciation and grammar)
  SELECT COUNT(*)
  INTO completed_sentences
  FROM learning_turns lt
  JOIN sessions s ON lt.session_id = s.id
  WHERE s.user_id = session_user_id
    AND lt.turn_completed = true
    AND (lt.pronunciation_feedback_json->>'overall_score')::NUMERIC > 80
    AND (lt.grammar_feedback_json->>'overall_score')::NUMERIC > 80;
  
  -- Award badge if 50 or more sentences mastered
  IF completed_sentences >= 50 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (session_user_id, 'sentences_mastered_50', 
            jsonb_build_object('sentences_count', completed_sentences))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for badge awarding
CREATE TRIGGER trigger_award_first_session
  AFTER INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION award_first_session_badge();

CREATE TRIGGER trigger_award_7_day_streak
  AFTER INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION award_7_day_streak_badge();

CREATE TRIGGER trigger_award_perfect_pronunciation
  AFTER INSERT OR UPDATE ON learning_turns
  FOR EACH ROW 
  WHEN (NEW.pronunciation_feedback_json IS NOT NULL)
  EXECUTE FUNCTION award_perfect_pronunciation_badge();

CREATE TRIGGER trigger_award_sentences_mastered
  AFTER UPDATE ON learning_turns
  FOR EACH ROW 
  WHEN (NEW.turn_completed = true AND OLD.turn_completed = false)
  EXECUTE FUNCTION award_sentences_mastered_badge();