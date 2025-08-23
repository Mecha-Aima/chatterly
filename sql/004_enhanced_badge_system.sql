-- Migration: Enhanced Badge System with Creative Badge Types
-- This migration adds comprehensive badge trigger functions for the gamification system

-- Create error logging table for badge system debugging
CREATE TABLE IF NOT EXISTS badge_error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message TEXT NOT NULL,
  context TEXT,
  user_id UUID,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for badge_error_logs
ALTER TABLE badge_error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for badge_error_logs (only admins can view)
CREATE POLICY "Admins can view badge error logs" ON badge_error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Enhanced function to award milestone badges based on session count
CREATE OR REPLACE FUNCTION award_milestone_badges()
RETURNS TRIGGER AS $$
DECLARE
  session_count INTEGER;
BEGIN
  -- Count total sessions for the user
  SELECT COUNT(*) INTO session_count
  FROM sessions 
  WHERE user_id = NEW.user_id;
  
  -- Award badges based on session milestones
  -- First Steps (1 session)
  IF session_count = 1 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'first_session', jsonb_build_object('session_id', NEW.id, 'session_count', session_count))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- Getting Started (5 sessions)
  IF session_count = 5 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'getting_started', jsonb_build_object('session_count', session_count))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- Committed Learner (25 sessions)
  IF session_count = 25 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'committed_learner', jsonb_build_object('session_count', session_count))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- Century Club (100 sessions)
  IF session_count = 100 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'century_club', jsonb_build_object('session_count', session_count))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- Learning Legend (500 sessions)
  IF session_count = 500 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'legend', jsonb_build_object('session_count', session_count))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO badge_error_logs (error_message, context, user_id, session_id) 
    VALUES (SQLERRM, 'milestone_badges', NEW.user_id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to award creative special badges
CREATE OR REPLACE FUNCTION award_creative_badges()
RETURNS TRIGGER AS $$
DECLARE
  session_hour INTEGER;
  morning_sessions INTEGER;
  evening_sessions INTEGER;
  languages_count INTEGER;
  daily_sessions INTEGER;
  weekend_sessions INTEGER;
  session_duration_minutes INTEGER;
BEGIN
  -- Extract hour from session start time
  session_hour := EXTRACT(HOUR FROM NEW.started_at);
  
  -- Early Bird badge (sessions before 9 AM)
  IF session_hour < 9 THEN
    SELECT COUNT(*) INTO morning_sessions
    FROM sessions 
    WHERE user_id = NEW.user_id 
      AND EXTRACT(HOUR FROM started_at) < 9
      AND started_at IS NOT NULL;
    
    IF morning_sessions >= 5 THEN
      INSERT INTO badges (user_id, badge_type, badge_data)
      VALUES (NEW.user_id, 'early_bird', jsonb_build_object('morning_sessions', morning_sessions))
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
  END IF;
  
  -- Night Owl badge (sessions after 9 PM)
  IF session_hour >= 21 THEN
    SELECT COUNT(*) INTO evening_sessions
    FROM sessions 
    WHERE user_id = NEW.user_id 
      AND EXTRACT(HOUR FROM started_at) >= 21
      AND started_at IS NOT NULL;
    
    IF evening_sessions >= 5 THEN
      INSERT INTO badges (user_id, badge_type, badge_data)
      VALUES (NEW.user_id, 'night_owl', jsonb_build_object('evening_sessions', evening_sessions))
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
  END IF;
  
  -- Polyglot badge (multiple languages)
  SELECT COUNT(DISTINCT target_language) INTO languages_count
  FROM sessions 
  WHERE user_id = NEW.user_id;
  
  IF languages_count >= 3 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'polyglot', jsonb_build_object('languages_count', languages_count))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- Quick Learner badge (5 sessions in one day)
  SELECT COUNT(*) INTO daily_sessions
  FROM sessions 
  WHERE user_id = NEW.user_id 
    AND DATE(started_at) = DATE(NEW.started_at)
    AND started_at IS NOT NULL;
  
  IF daily_sessions >= 5 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'quick_learner', jsonb_build_object('daily_sessions', daily_sessions, 'date', DATE(NEW.started_at)))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- Weekend Warrior badge (sessions on weekends)
  IF EXTRACT(DOW FROM NEW.started_at) IN (0, 6) THEN -- Sunday = 0, Saturday = 6
    SELECT COUNT(DISTINCT DATE(started_at)) INTO weekend_sessions
    FROM sessions 
    WHERE user_id = NEW.user_id 
      AND EXTRACT(DOW FROM started_at) IN (0, 6)
      AND started_at IS NOT NULL;
    
    IF weekend_sessions >= 10 THEN
      INSERT INTO badges (user_id, badge_type, badge_data)
      VALUES (NEW.user_id, 'weekend_warrior', jsonb_build_object('weekend_sessions', weekend_sessions))
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
  END IF;
  
  -- Marathon Learner badge (session over 30 minutes)
  IF NEW.started_at IS NOT NULL AND NEW.ended_at IS NOT NULL THEN
    session_duration_minutes := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
    
    IF session_duration_minutes >= 30 THEN
      INSERT INTO badges (user_id, badge_type, badge_data)
      VALUES (NEW.user_id, 'marathon_learner', jsonb_build_object('duration_minutes', session_duration_minutes))
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO badge_error_logs (error_message, context, user_id, session_id) 
    VALUES (SQLERRM, 'creative_badges', NEW.user_id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to award streak badges
CREATE OR REPLACE FUNCTION award_streak_badges()
RETURNS TRIGGER AS $$
DECLARE
  consecutive_days INTEGER;
  streak_start_date DATE;
  session_date DATE;
BEGIN
  session_date := DATE(NEW.started_at);
  
  -- Calculate consecutive days with sessions
  WITH daily_sessions AS (
    SELECT DISTINCT DATE(started_at) as session_date
    FROM sessions 
    WHERE user_id = NEW.user_id 
      AND started_at IS NOT NULL
      AND DATE(started_at) <= session_date
    ORDER BY session_date DESC
  ),
  consecutive_streak AS (
    SELECT session_date,
           ROW_NUMBER() OVER (ORDER BY session_date DESC) as rn,
           session_date + INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY session_date DESC) as expected_date
    FROM daily_sessions
  )
  SELECT COUNT(*) INTO consecutive_days
  FROM consecutive_streak
  WHERE expected_date = session_date + INTERVAL '1 day';
  
  -- Award streak badges based on consecutive days
  -- 3-day streak
  IF consecutive_days >= 3 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'three_day_streak', jsonb_build_object('streak_days', consecutive_days))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- 7-day streak (Week Warrior)
  IF consecutive_days >= 7 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, '7_day_streak', jsonb_build_object('streak_days', consecutive_days))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- 30-day streak (Month Master)
  IF consecutive_days >= 30 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'month_master', jsonb_build_object('streak_days', consecutive_days))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- 100-day streak (Streak Legend)
  IF consecutive_days >= 100 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (NEW.user_id, 'streak_legend', jsonb_build_object('streak_days', consecutive_days))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO badge_error_logs (error_message, context, user_id, session_id) 
    VALUES (SQLERRM, 'streak_badges', NEW.user_id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to award performance badges
CREATE OR REPLACE FUNCTION award_performance_badges()
RETURNS TRIGGER AS $$
DECLARE
  pronunciation_score NUMERIC;
  grammar_score NUMERIC;
  session_user_id UUID;
  consistent_pronunciation_sessions INTEGER;
  consistent_grammar_sessions INTEGER;
  consistent_overall_sessions INTEGER;
  completed_sentences INTEGER;
BEGIN
  -- Extract scores from feedback JSON
  pronunciation_score := COALESCE((NEW.pronunciation_feedback_json->>'overall_score')::NUMERIC, 0);
  grammar_score := COALESCE((NEW.grammar_feedback_json->>'overall_score')::NUMERIC, 0);
  
  -- Get the user_id from the session
  SELECT user_id INTO session_user_id 
  FROM sessions 
  WHERE id = NEW.session_id;
  
  -- Perfect Pronunciation badge (90%+ pronunciation score)
  IF pronunciation_score >= 90 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (session_user_id, 'perfect_pronunciation', 
            jsonb_build_object('turn_id', NEW.id, 'score', pronunciation_score))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- Grammar Guru badge (95%+ grammar score)
  IF grammar_score >= 95 THEN
    INSERT INTO badges (user_id, badge_type, badge_data)
    VALUES (session_user_id, 'grammar_guru', 
            jsonb_build_object('turn_id', NEW.id, 'score', grammar_score))
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
  
  -- Check for consistency badges (only when turn is completed)
  IF NEW.turn_completed = true THEN
    -- Count recent sessions with high pronunciation scores (90%+)
    SELECT COUNT(DISTINCT lt.session_id) INTO consistent_pronunciation_sessions
    FROM learning_turns lt
    JOIN sessions s ON lt.session_id = s.id
    WHERE s.user_id = session_user_id
      AND lt.turn_completed = true
      AND (lt.pronunciation_feedback_json->>'overall_score')::NUMERIC >= 90
      AND s.started_at >= NOW() - INTERVAL '30 days';
    
    -- Pronunciation Master badge (90%+ for 10 sessions)
    IF consistent_pronunciation_sessions >= 10 THEN
      INSERT INTO badges (user_id, badge_type, badge_data)
      VALUES (session_user_id, 'pronunciation_master', 
              jsonb_build_object('consistent_sessions', consistent_pronunciation_sessions))
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    
    -- Count recent sessions with high overall scores (95%+)
    SELECT COUNT(DISTINCT lt.session_id) INTO consistent_overall_sessions
    FROM learning_turns lt
    JOIN sessions s ON lt.session_id = s.id
    WHERE s.user_id = session_user_id
      AND lt.turn_completed = true
      AND (lt.pronunciation_feedback_json->>'overall_score')::NUMERIC >= 95
      AND (lt.grammar_feedback_json->>'overall_score')::NUMERIC >= 95
      AND s.started_at >= NOW() - INTERVAL '30 days';
    
    -- Perfectionist badge (95%+ overall for 10 sessions)
    IF consistent_overall_sessions >= 10 THEN
      INSERT INTO badges (user_id, badge_type, badge_data)
      VALUES (session_user_id, 'perfectionist', 
              jsonb_build_object('consistent_sessions', consistent_overall_sessions))
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
    
    -- Sentence Master badge (50 sentences with 80%+ accuracy)
    SELECT COUNT(*) INTO completed_sentences
    FROM learning_turns lt
    JOIN sessions s ON lt.session_id = s.id
    WHERE s.user_id = session_user_id
      AND lt.turn_completed = true
      AND (lt.pronunciation_feedback_json->>'overall_score')::NUMERIC >= 80
      AND (lt.grammar_feedback_json->>'overall_score')::NUMERIC >= 80;
    
    IF completed_sentences >= 50 THEN
      INSERT INTO badges (user_id, badge_type, badge_data)
      VALUES (session_user_id, 'sentences_mastered_50', 
              jsonb_build_object('sentences_count', completed_sentences))
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO badge_error_logs (error_message, context, user_id, session_id) 
    VALUES (SQLERRM, 'performance_badges', session_user_id, NEW.session_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers to replace with enhanced versions
DROP TRIGGER IF EXISTS trigger_award_first_session ON sessions;
DROP TRIGGER IF EXISTS trigger_award_7_day_streak ON sessions;
DROP TRIGGER IF EXISTS trigger_award_perfect_pronunciation ON learning_turns;
DROP TRIGGER IF EXISTS trigger_award_sentences_mastered ON learning_turns;

-- Create enhanced triggers for comprehensive badge awarding
CREATE TRIGGER trigger_award_milestone_badges
  AFTER INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION award_milestone_badges();

CREATE TRIGGER trigger_award_creative_badges
  AFTER INSERT OR UPDATE ON sessions
  FOR EACH ROW 
  WHEN (NEW.started_at IS NOT NULL)
  EXECUTE FUNCTION award_creative_badges();

CREATE TRIGGER trigger_award_streak_badges
  AFTER INSERT ON sessions
  FOR EACH ROW 
  WHEN (NEW.started_at IS NOT NULL)
  EXECUTE FUNCTION award_streak_badges();

CREATE TRIGGER trigger_award_performance_badges
  AFTER INSERT OR UPDATE ON learning_turns
  FOR EACH ROW 
  WHEN (NEW.pronunciation_feedback_json IS NOT NULL OR NEW.grammar_feedback_json IS NOT NULL)
  EXECUTE FUNCTION award_performance_badges();

-- Create indexes for efficient badge queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON sessions(user_id, started_at) WHERE started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_language ON sessions(user_id, target_language);
CREATE INDEX IF NOT EXISTS idx_learning_turns_completed ON learning_turns(session_id, turn_completed);
CREATE INDEX IF NOT EXISTS idx_learning_turns_scores ON learning_turns(session_id) WHERE pronunciation_feedback_json IS NOT NULL AND grammar_feedback_json IS NOT NULL;

-- Add helpful comments
COMMENT ON FUNCTION award_milestone_badges() IS 'Awards badges based on session count milestones (1, 5, 25, 100, 500 sessions)';
COMMENT ON FUNCTION award_creative_badges() IS 'Awards special badges for creative achievements (early bird, night owl, polyglot, etc.)';
COMMENT ON FUNCTION award_streak_badges() IS 'Awards badges for consecutive day learning streaks (3, 7, 30, 100 days)';
COMMENT ON FUNCTION award_performance_badges() IS 'Awards badges for performance achievements (pronunciation, grammar, consistency)';
COMMENT ON TABLE badge_error_logs IS 'Logs errors from badge awarding functions for debugging and monitoring';