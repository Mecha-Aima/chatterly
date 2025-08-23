import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { 
  AuthErrorHandler, 
  DatabaseErrorHandler,
  GlobalErrorHandler 
} from '@/lib/errorHandling';
import { calculateUserProgress, type ProgressMetrics } from '@/lib/progressCalculation';

// Type definitions for progress API responses
export interface ProgressResponse {
  overall_stats: {
    total_sessions: number;
    completed_sessions: number;
    current_streak: number;
    longest_streak: number;
    total_learning_time: number;
    favorite_language: string | null;
  };
  performance_metrics: {
    average_pronunciation_score: number;
    average_grammar_score: number;
    completion_rate: number;
    improvement_trend: 'improving' | 'stable' | 'declining';
    learning_velocity: number;
  };
  recent_activity: {
    last_session_date: string | null;
    sessions_this_week: number;
    sessions_this_month: number;
    badges_earned_this_month: number;
  };
  language_stats: {
    languages_practiced: string[];
    sessions_by_language: Record<string, number>;
  };
  detailed_metrics: {
    pronunciation_trend: 'improving' | 'stable' | 'declining';
    grammar_trend: 'improving' | 'stable' | 'declining';
    average_session_duration: number;
    total_turns: number;
    completed_turns: number;
  };
}

// Simple in-memory cache for expensive calculations
interface CacheEntry {
  data: ProgressResponse;
  timestamp: number;
  userId: string;
}

const progressCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET(request: NextRequest) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error in progress API:', authError);
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Check cache first
    const cacheKey = `progress_${user.id}`;
    const cachedEntry = progressCache.get(cacheKey);
    const now = Date.now();

    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
      console.log('Returning cached progress data for user:', user.id);
      return NextResponse.json(cachedEntry.data, { status: 200 });
    }

    try {
      // Calculate comprehensive user progress
      const progressMetrics = await calculateUserProgress(user.id);

      // Get recent badge count for activity metrics
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: recentBadges, error: badgesError } = await supabase
        .from('badges')
        .select('id')
        .eq('user_id', user.id)
        .gte('awarded_at', oneMonthAgo.toISOString());

      if (badgesError) {
        console.error('Error fetching recent badges:', badgesError);
        // Continue without badge count rather than failing
      }

      // Get last session date
      const { data: lastSession, error: lastSessionError } = await supabase
        .from('sessions')
        .select('ended_at')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSessionError && lastSessionError.code !== 'PGRST116') {
        console.error('Error fetching last session:', lastSessionError);
        // Continue without last session date
      }

      // Transform progress metrics to API response format
      const response: ProgressResponse = {
        overall_stats: {
          total_sessions: progressMetrics.session_stats.total_sessions,
          completed_sessions: progressMetrics.session_stats.completed_sessions,
          current_streak: progressMetrics.streak_info.current_streak,
          longest_streak: progressMetrics.streak_info.longest_streak,
          total_learning_time: Math.round(progressMetrics.time_stats.total_learning_time_minutes),
          favorite_language: progressMetrics.language_stats.favorite_language,
        },
        performance_metrics: {
          average_pronunciation_score: Math.round(progressMetrics.average_pronunciation_score * 10) / 10,
          average_grammar_score: Math.round(progressMetrics.average_grammar_score * 10) / 10,
          completion_rate: Math.round(progressMetrics.completion_rate * 10) / 10,
          improvement_trend: progressMetrics.performance_trends.overall_trend,
          learning_velocity: Math.round(progressMetrics.learning_velocity * 10) / 10,
        },
        recent_activity: {
          last_session_date: lastSession?.ended_at || null,
          sessions_this_week: progressMetrics.time_stats.sessions_this_week,
          sessions_this_month: progressMetrics.time_stats.sessions_this_month,
          badges_earned_this_month: recentBadges?.length || 0,
        },
        language_stats: {
          languages_practiced: progressMetrics.language_stats.languages_practiced,
          sessions_by_language: progressMetrics.language_stats.sessions_by_language,
        },
        detailed_metrics: {
          pronunciation_trend: progressMetrics.performance_trends.pronunciation_trend,
          grammar_trend: progressMetrics.performance_trends.grammar_trend,
          average_session_duration: Math.round(progressMetrics.time_stats.average_session_duration * 10) / 10,
          total_turns: progressMetrics.session_stats.total_turns,
          completed_turns: progressMetrics.session_stats.completed_turns,
        },
      };

      // Cache the result
      progressCache.set(cacheKey, {
        data: response,
        timestamp: now,
        userId: user.id
      });

      // Clean up old cache entries periodically
      cleanupCache();

      return NextResponse.json(response, { status: 200 });

    } catch (error) {
      console.error('Error calculating user progress:', error);
      
      // Return fallback response instead of failing completely
      const fallbackResponse: ProgressResponse = {
        overall_stats: {
          total_sessions: 0,
          completed_sessions: 0,
          current_streak: 0,
          longest_streak: 0,
          total_learning_time: 0,
          favorite_language: null,
        },
        performance_metrics: {
          average_pronunciation_score: 0,
          average_grammar_score: 0,
          completion_rate: 0,
          improvement_trend: 'stable',
          learning_velocity: 0,
        },
        recent_activity: {
          last_session_date: null,
          sessions_this_week: 0,
          sessions_this_month: 0,
          badges_earned_this_month: 0,
        },
        language_stats: {
          languages_practiced: [],
          sessions_by_language: {},
        },
        detailed_metrics: {
          pronunciation_trend: 'stable',
          grammar_trend: 'stable',
          average_session_duration: 0,
          total_turns: 0,
          completed_turns: 0,
        },
      };

      return NextResponse.json(fallbackResponse, { status: 200 });
    }
  })();
}

/**
 * Clean up old cache entries to prevent memory leaks
 */
function cleanupCache(): void {
  const now = Date.now();
  const maxAge = CACHE_DURATION * 2; // Clean entries older than 2x cache duration

  for (const [key, entry] of progressCache.entries()) {
    if (now - entry.timestamp > maxAge) {
      progressCache.delete(key);
    }
  }

  // Limit cache size to prevent unbounded growth
  if (progressCache.size > 1000) {
    const entries = Array.from(progressCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      progressCache.delete(entries[i][0]);
    }
  }
}

/**
 * Clear cache for a specific user (useful for real-time updates)
 */
export function clearUserProgressCache(userId: string): void {
  const cacheKey = `progress_${userId}`;
  progressCache.delete(cacheKey);
}