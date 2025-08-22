-- Seed data for sentence_bank (example minimal seed set per spec guidance)
-- NOTE: Adjust languages/categories as needed. This is a minimal placeholder to enable local testing.

INSERT INTO sentence_bank (id, language, difficulty_level, sentence_text, meaning_english, pronunciation_guide, category)
VALUES
  ('en-beg-001', 'en', 'beginner', 'Hello', 'A greeting', 'heh-loh', 'greetings')
ON CONFLICT DO NOTHING;

INSERT INTO sentence_bank (id, language, difficulty_level, sentence_text, meaning_english, pronunciation_guide, category)
VALUES
  ('en-beg-002', 'en', 'beginner', 'How are you?', 'Asking about well-being', 'how ar yoo', 'greetings')
ON CONFLICT DO NOTHING;
