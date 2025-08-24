import { z } from 'zod';
import { Database } from '@/types/database.types';

// Session types from database
export type Session = Database['public']['Tables']['sessions']['Row'];
export type SessionInsert = Database['public']['Tables']['sessions']['Insert'];
export type SessionUpdate = Database['public']['Tables']['sessions']['Update'];

export type LearningTurn = Database['public']['Tables']['learning_turns']['Row'];
export type LearningTurnInsert = Database['public']['Tables']['learning_turns']['Insert'];
export type LearningTurnUpdate = Database['public']['Tables']['learning_turns']['Update'];

// Session state enums
export enum SessionStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

export enum TurnStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

// Validation schemas
const difficultyLevelValues = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED] as const;

export const sessionCreateSchema = z.object({
  target_language: z.string().min(2, 'Target language is required'),
  difficulty_level: z.enum(difficultyLevelValues),
  persona_id: z.string().optional()
});

export const sessionUpdateSchema = z.object({
  difficulty_level: z.enum(difficultyLevelValues).optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  total_turns: z.number().int().min(0).optional(),
  completed_turns: z.number().int().min(0).optional(),
  audio_url: z.string().url().optional().nullable(),
  session_transcript_json: z.record(z.string(), z.any()).optional(),
  overall_progress_json: z.record(z.string(), z.any()).optional()
});

export const turnCreateSchema = z.object({
  session_id: z.string().uuid(),
  turn_number: z.number().int().min(1),
  target_sentence: z.string().min(1, 'Target sentence is required'),
  sentence_meaning: z.string().optional()
});

export const turnUpdateSchema = z.object({
  user_transcript: z.string().optional(),
  pronunciation_feedback_json: z.record(z.string(), z.any()).optional(),
  grammar_feedback_json: z.record(z.string(), z.any()).optional(),
  turn_completed: z.boolean().optional()
});

// Response schemas
export const sessionResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  target_language: z.string(),
  difficulty_level: z.string().nullable(),
  persona_id: z.string().nullable(),
  started_at: z.string().datetime().nullable(),
  ended_at: z.string().datetime().nullable(),
  total_turns: z.number().int().nullable(),
  completed_turns: z.number().int().nullable(),
  audio_url: z.string().nullable(),
  session_transcript_json: z.record(z.string(), z.any()).nullable(),
  overall_progress_json: z.record(z.string(), z.any()).nullable(),
  created_at: z.string().datetime().nullable()
});

export const turnResponseSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  turn_number: z.number().int(),
  target_sentence: z.string(),
  sentence_meaning: z.string().nullable(),
  user_transcript: z.string().nullable(),
  pronunciation_feedback_json: z.record(z.string(), z.any()).nullable(),
  grammar_feedback_json: z.record(z.string(), z.any()).nullable(),
  turn_completed: z.boolean().nullable(),
  created_at: z.string().datetime().nullable()
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional()
  })
});

// Request/Response types
export type SessionCreateRequest = z.infer<typeof sessionCreateSchema>;
export type SessionUpdateRequest = z.infer<typeof sessionUpdateSchema>;
export type TurnCreateRequest = z.infer<typeof turnCreateSchema>;
export type TurnUpdateRequest = z.infer<typeof turnUpdateSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type TurnResponse = z.infer<typeof turnResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// Session metadata types
export interface SessionMetadata {
  status: SessionStatus;
  progress_percentage: number;
  time_spent_minutes: number;
  current_turn?: number;
}

export interface TurnMetadata {
  status: TurnStatus;
  pronunciation_score?: number;
  grammar_score?: number;
  completion_time_seconds?: number;
}

// Progress tracking types
export interface SessionProgress {
  session_id: string;
  total_turns: number;
  completed_turns: number;
  success_rate: number;
  average_pronunciation_score: number;
  average_grammar_score: number;
  time_spent_minutes: number;
}

export interface LearningMetrics {
  pronunciation_accuracy: number;
  grammar_accuracy: number;
  completion_rate: number;
  response_time_avg: number;
  improvement_trend: 'improving' | 'stable' | 'declining';
}
