/**
 * Progress Calculation System for Chatterly Gamification
 * 
 * This module provides comprehensive progress calculation functions that analyze
 * user session data to compute completion rates, accuracy scores, streaks, and
 * other learning metrics. It integrates with the existing session completion
 * workflow to provide real-time progress updates.
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Database } from '@/types/database.types';

// Type definitions for progress metrics
export interface ProgressMetrics {
  completion_rate: number;
  average_pronunciation_score: number;
  average_grammar_score: number;
  learning_velocity: number; // sessions per week
  streak_info: {
    current_streak: number;
    longest_streak: number;
    streak_start_date: string | null;
  };
  session_stats: {
    total_sessions: number;
    completed_sessions: number;
    total_turns: number;
    completed_turns: number;
  };
  performance_trends: {
    pronunciation_trend: 'improving' | 'stable' | 'declining';
    grammar_trend: 'improving' | 'stable' | 'declining';
    overall_trend: 'improving' | 'stable' | 'declining';
  };
  language_stats: {
    languages_practiced: string[];
    favorite_language: string | null;
    sessions_by_language: Record<string, number>;
  };
  time_stats: {
    total_learning_time_minutes: number;
    average_session_duration: number;
    sessions_this_week: number;
    sessions_this_month: number;
  };
}

export interface SessionProgressData {
  session_metrics: {
    completion_time_minutes: number;
    turns_completed: number;
    turns_total: number;
    completion_rate: number;
  };
  performance_scores: {
    pronunciation_scores: number[];
    grammar_scores: number[];
    overall_average: number;
  };
  badge_progress: {
    badges_earned_this_session: string[];
    progress_toward_next: Array<{
      badge_id: string;
      current_progress: number;
      required_progress: number;
      percentage: number;
    }>;
  };
}

/**
 * Calculate comprehensive user progress metrics by analyzing all session data
 */
export async function calculateUserProgress(userId: string): Promise<ProgressMetrics> {
  const supabase = await createServerSupabaseClient();

  // Fetch all user sessions with related data
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select(`
      id,
      target_language,
      started_at,
      ended_at,
      total_turns,
      completed_turns,
      overall_progress_json,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (sessionsError) {
    console.error('Error fetching sessions for progress calculation:', sessionsError);
    throw new Error('Failed to fetch session data for progress calculation');
  }

  // Fetch all learning turns for detailed analysis
  const sessionIds = sessions?.map(s => s.id) || [];
  const { data: turns, error: turnsError } = await supabase
    .from('learning_turns')
    .select(`
      session_id,
      turn_completed,
      pronunciation_feedback_json,
      grammar_feedback_json,
      created_at
    `)
    .in('session_id', sessionIds);

  if (turnsError) {
    console.error('Error fetching turns for progress calculation:', turnsError);
    throw new Error('Failed to fetch turn data for progress calculation');
  }

  // Calculate basic session statistics
  const totalSessions = sessions?.length || 0;
  const completedSessions = sessions?.filter(s => s.ended_at).length || 0;
  const totalTurns = turns?.length || 0;
  const completedTurns = turns?.filter(t => t.turn_completed).length || 0;

  // Calculate completion rate
  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  // Calculate average scores from turns
  const { avgPronunciation, avgGrammar, pronunciationTrend, grammarTrend } = calculateScoreMetrics(turns || []);

  // Calculate streak information
  const streakInfo = calculateStreakInfo(sessions || []);

  // Calculate learning velocity (sessions per week)
  const learningVelocity = calculateLearningVelocity(sessions || []);

  // Calculate language statistics
  const languageStats = calculateLanguageStats(sessions || []);

  // Calculate time-based statistics
  const timeStats = calculateTimeStats(sessions || []);

  // Determine overall trend
  const overallTrend = determineOverallTrend(pronunciationTrend, grammarTrend, sessions || []);

  return {
    completion_rate: completionRate,
    average_pronunciation_score: avgPronunciation,
    average_grammar_score: avgGrammar,
    learning_velocity: learningVelocity,
    streak_info: streakInfo,
    session_stats: {
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      total_turns: totalTurns,
      completed_turns: completedTurns,
    },
    performance_trends: {
      pronunciation_trend: pronunciationTrend,
      grammar_trend: grammarTrend,
      overall_trend: overallTrend,
    },
    language_stats: languageStats,
    time_stats: timeStats,
  };
}

/**
 * Update session progress data in the overall_progress_json field
 */
export async function updateSessionProgress(sessionId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Fetch session data
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      id,
      user_id,
      started_at,
      ended_at,
      total_turns,
      completed_turns,
      target_language
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    console.error('Error fetching session for progress update:', sessionError);
    throw new Error('Failed to fetch session data for progress update');
  }

  // Fetch session turns
  const { data: turns, error: turnsError } = await supabase
    .from('learning_turns')
    .select(`
      turn_completed,
      pronunciation_feedback_json,
      grammar_feedback_json,
      created_at
    `)
    .eq('session_id', sessionId)
    .order('turn_number', { ascending: true });

  if (turnsError) {
    console.error('Error fetching turns for session progress:', turnsError);
    throw new Error('Failed to fetch turn data for session progress');
  }

  // Calculate session-specific metrics
  const sessionDuration = calculateSessionDuration(session.started_at, session.ended_at);
  const { pronunciationScores, grammarScores, overallAverage } = extractSessionScores(turns || []);

  // Fetch recently earned badges for this session (badges awarded in the last few minutes)
  const recentBadgeThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
  const { data: recentBadges } = await supabase
    .from('badges')
    .select('badge_type')
    .eq('user_id', session.user_id)
    .gte('awarded_at', recentBadgeThreshold.toISOString());

  // Create session progress data
  const sessionProgressData: SessionProgressData = {
    session_metrics: {
      completion_time_minutes: sessionDuration,
      turns_completed: session.completed_turns || 0,
      turns_total: session.total_turns || 0,
      completion_rate: session.total_turns ? ((session.completed_turns || 0) / session.total_turns) * 100 : 0,
    },
    performance_scores: {
      pronunciation_scores: pronunciationScores,
      grammar_scores: grammarScores,
      overall_average: overallAverage,
    },
    badge_progress: {
      badges_earned_this_session: recentBadges?.map(b => b.badge_type) || [],
      progress_toward_next: [], // This would be populated by badge progress calculation
    },
  };

  // Update session with progress data
  const { error: updateError } = await supabase
    .from('sessions')
    .update({
      overall_progress_json: sessionProgressData as any
    })
    .eq('id', sessionId);

  if (updateError) {
    console.error('Error updating session progress:', updateError);
    throw new Error('Failed to update session progress data');
  }
}

/**
 * Calculate pronunciation and grammar score metrics with trends
 */
function calculateScoreMetrics(turns: any[]): {
  avgPronunciation: number;
  avgGrammar: number;
  pronunciationTrend: 'improving' | 'stable' | 'declining';
  grammarTrend: 'improving' | 'stable' | 'declining';
} {
  if (turns.length === 0) {
    return {
      avgPronunciation: 0,
      avgGrammar: 0,
      pronunciationTrend: 'stable',
      grammarTrend: 'stable',
    };
  }

  let totalPronunciation = 0;
  let totalGrammar = 0;
  let pronunciationCount = 0;
  let grammarCount = 0;
  const pronunciationScores: number[] = [];
  const grammarScores: number[] = [];

  turns.forEach(turn => {
    // Extract pronunciation score
    if (turn.pronunciation_feedback_json && typeof turn.pronunciation_feedback_json === 'object') {
      const pronunciationScore = (turn.pronunciation_feedback_json as any)?.overall_score;
      if (typeof pronunciationScore === 'number') {
        totalPronunciation += pronunciationScore;
        pronunciationCount++;
        pronunciationScores.push(pronunciationScore);
      }
    }

    // Extract grammar score
    if (turn.grammar_feedback_json && typeof turn.grammar_feedback_json === 'object') {
      const grammarScore = (turn.grammar_feedback_json as any)?.overall_score;
      if (typeof grammarScore === 'number') {
        totalGrammar += grammarScore;
        grammarCount++;
        grammarScores.push(grammarScore);
      }
    }
  });

  const avgPronunciation = pronunciationCount > 0 ? totalPronunciation / pronunciationCount : 0;
  const avgGrammar = grammarCount > 0 ? totalGrammar / grammarCount : 0;

  // Calculate trends (compare first half vs second half of scores)
  const pronunciationTrend = calculateTrend(pronunciationScores);
  const grammarTrend = calculateTrend(grammarScores);

  return {
    avgPronunciation,
    avgGrammar,
    pronunciationTrend,
    grammarTrend,
  };
}

/**
 * Calculate trend from a series of scores
 */
function calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
  if (scores.length < 4) return 'stable'; // Need at least 4 scores to determine trend

  const midpoint = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, midpoint);
  const secondHalf = scores.slice(midpoint);

  const firstHalfAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

  const difference = secondHalfAvg - firstHalfAvg;
  const threshold = 2; // 2% threshold for trend detection

  if (difference > threshold) return 'improving';
  if (difference < -threshold) return 'declining';
  return 'stable';
}

/**
 * Calculate streak information from sessions
 */
function calculateStreakInfo(sessions: any[]): {
  current_streak: number;
  longest_streak: number;
  streak_start_date: string | null;
} {
  if (sessions.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      streak_start_date: null,
    };
  }

  // Sort sessions by date
  const completedSessions = sessions
    .filter(s => s.ended_at)
    .sort((a, b) => new Date(a.ended_at).getTime() - new Date(b.ended_at).getTime());

  if (completedSessions.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      streak_start_date: null,
    };
  }

  let currentStreak = 1;
  let longestStreak = 1;
  let streakStartDate = completedSessions[completedSessions.length - 1].ended_at;
  let tempStreak = 1;

  // Calculate streaks by checking consecutive days
  for (let i = completedSessions.length - 2; i >= 0; i--) {
    const currentDate = new Date(completedSessions[i + 1].ended_at);
    const previousDate = new Date(completedSessions[i].ended_at);
    
    // Check if sessions are on consecutive days
    const dayDifference = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDifference <= 1) {
      tempStreak++;
      if (i === completedSessions.length - 2) {
        currentStreak = tempStreak;
        streakStartDate = completedSessions[i].ended_at;
      }
    } else {
      if (i === completedSessions.length - 2) {
        currentStreak = 1;
      }
      tempStreak = 1;
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    streak_start_date: streakStartDate,
  };
}

/**
 * Calculate learning velocity (sessions per week)
 */
function calculateLearningVelocity(sessions: any[]): number {
  if (sessions.length === 0) return 0;

  const completedSessions = sessions.filter(s => s.ended_at);
  if (completedSessions.length === 0) return 0;

  const firstSession = new Date(completedSessions[0].ended_at);
  const lastSession = new Date(completedSessions[completedSessions.length - 1].ended_at);
  const daysDifference = Math.max(1, Math.floor((lastSession.getTime() - firstSession.getTime()) / (1000 * 60 * 60 * 24)));
  const weeksDifference = daysDifference / 7;

  return completedSessions.length / weeksDifference;
}

/**
 * Calculate language-related statistics
 */
function calculateLanguageStats(sessions: any[]): {
  languages_practiced: string[];
  favorite_language: string | null;
  sessions_by_language: Record<string, number>;
} {
  const sessionsByLanguage: Record<string, number> = {};
  
  sessions.forEach(session => {
    if (session.target_language) {
      sessionsByLanguage[session.target_language] = (sessionsByLanguage[session.target_language] || 0) + 1;
    }
  });

  const languagesPracticed = Object.keys(sessionsByLanguage);
  const favoriteLanguage = languagesPracticed.length > 0 
    ? Object.entries(sessionsByLanguage).reduce((a, b) => a[1] > b[1] ? a : b)[0]
    : null;

  return {
    languages_practiced: languagesPracticed,
    favorite_language: favoriteLanguage,
    sessions_by_language: sessionsByLanguage,
  };
}

/**
 * Calculate time-based statistics
 */
function calculateTimeStats(sessions: any[]): {
  total_learning_time_minutes: number;
  average_session_duration: number;
  sessions_this_week: number;
  sessions_this_month: number;
} {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalLearningTime = 0;
  let sessionsWithDuration = 0;
  let sessionsThisWeek = 0;
  let sessionsThisMonth = 0;

  sessions.forEach(session => {
    if (session.ended_at) {
      const sessionDate = new Date(session.ended_at);
      
      // Count recent sessions
      if (sessionDate >= oneWeekAgo) sessionsThisWeek++;
      if (sessionDate >= oneMonthAgo) sessionsThisMonth++;

      // Calculate duration if both start and end times are available
      if (session.started_at) {
        const duration = calculateSessionDuration(session.started_at, session.ended_at);
        totalLearningTime += duration;
        sessionsWithDuration++;
      }
    }
  });

  const averageSessionDuration = sessionsWithDuration > 0 ? totalLearningTime / sessionsWithDuration : 0;

  return {
    total_learning_time_minutes: totalLearningTime,
    average_session_duration: averageSessionDuration,
    sessions_this_week: sessionsThisWeek,
    sessions_this_month: sessionsThisMonth,
  };
}

/**
 * Calculate session duration in minutes
 */
function calculateSessionDuration(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Extract scores from session turns
 */
function extractSessionScores(turns: any[]): {
  pronunciationScores: number[];
  grammarScores: number[];
  overallAverage: number;
} {
  const pronunciationScores: number[] = [];
  const grammarScores: number[] = [];

  turns.forEach(turn => {
    if (turn.pronunciation_feedback_json && typeof turn.pronunciation_feedback_json === 'object') {
      const score = (turn.pronunciation_feedback_json as any)?.overall_score;
      if (typeof score === 'number') {
        pronunciationScores.push(score);
      }
    }

    if (turn.grammar_feedback_json && typeof turn.grammar_feedback_json === 'object') {
      const score = (turn.grammar_feedback_json as any)?.overall_score;
      if (typeof score === 'number') {
        grammarScores.push(score);
      }
    }
  });

  // Calculate overall average from both pronunciation and grammar scores
  const allScores = [...pronunciationScores, ...grammarScores];
  const overallAverage = allScores.length > 0 
    ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
    : 0;

  return {
    pronunciationScores,
    grammarScores,
    overallAverage,
  };
}

/**
 * Determine overall performance trend
 */
function determineOverallTrend(
  pronunciationTrend: 'improving' | 'stable' | 'declining',
  grammarTrend: 'improving' | 'stable' | 'declining',
  sessions: any[]
): 'improving' | 'stable' | 'declining' {
  // If we have recent sessions, prioritize recent performance
  if (sessions.length >= 5) {
    const recentSessions = sessions.slice(-5);
    const recentCompletionRate = recentSessions.filter(s => s.ended_at).length / recentSessions.length;
    
    // If completion rate is improving and at least one skill is improving
    if (recentCompletionRate > 0.8 && (pronunciationTrend === 'improving' || grammarTrend === 'improving')) {
      return 'improving';
    }
    
    // If both skills are declining
    if (pronunciationTrend === 'declining' && grammarTrend === 'declining') {
      return 'declining';
    }
  }

  // Default logic based on individual trends
  if (pronunciationTrend === 'improving' || grammarTrend === 'improving') {
    return 'improving';
  }
  if (pronunciationTrend === 'declining' && grammarTrend === 'declining') {
    return 'declining';
  }
  return 'stable';
}