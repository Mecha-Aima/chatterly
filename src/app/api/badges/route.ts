import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { 
  AuthErrorHandler, 
  DatabaseErrorHandler,
  GlobalErrorHandler 
} from '@/lib/errorHandling';
import { 
  BADGE_DEFINITIONS, 
  getBadgeDefinition, 
  type BadgeDefinition 
} from '@/lib/badgeDefinitions';
import { Database } from '@/types/database.types';

// Type definitions for badge API responses
export interface EarnedBadge {
  id: string;
  badge_type: string;
  awarded_at: string | null;
  badge_data: Record<string, any> | null;
  definition: BadgeDefinition;
}

export interface BadgeProgress {
  badge_id: string;
  current_progress: number;
  required_progress: number;
  percentage: number;
}

export interface BadgeResponse {
  earned_badges: EarnedBadge[];
  available_badges: BadgeDefinition[];
  progress: BadgeProgress[];
}

type BadgeRow = Database['public']['Tables']['badges']['Row'];

export async function GET(request: NextRequest) {
  return GlobalErrorHandler.withErrorHandling(async () => {
    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error in badges API:', authError);
      throw AuthErrorHandler.createUnauthorizedError();
    }

    // Fetch user's earned badges
    const { data: earnedBadgesData, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', user.id)
      .order('awarded_at', { ascending: false });

    if (badgesError) {
      console.error('Error fetching user badges:', badgesError);
      throw DatabaseErrorHandler.fromSupabaseError(badgesError);
    }

    // Transform earned badges with definitions
    const earnedBadges: EarnedBadge[] = (earnedBadgesData || []).map((badge: BadgeRow) => {
      const definition = getBadgeDefinition(badge.badge_type);
      
      if (!definition) {
        console.warn(`Badge definition not found for badge type: ${badge.badge_type}`);
        // Return a fallback badge definition
        return {
          id: badge.id,
          badge_type: badge.badge_type,
          awarded_at: badge.awarded_at,
          badge_data: badge.badge_data as Record<string, any> | null,
          definition: {
            id: badge.badge_type,
            name: 'Unknown Badge',
            description: 'Badge definition not found',
            imageUrl: '/badges/unknown.png',
            category: 'special',
            rarity: 'common',
            criteria: { type: 'special' }
          }
        };
      }

      return {
        id: badge.id,
        badge_type: badge.badge_type,
        awarded_at: badge.awarded_at,
        badge_data: badge.badge_data as Record<string, any> | null,
        definition
      };
    });

    // Get earned badge types for filtering available badges
    const earnedBadgeTypes = new Set(earnedBadges.map(badge => badge.badge_type));

    // Filter available badges (not yet earned)
    const availableBadges = BADGE_DEFINITIONS.filter(
      badge => !earnedBadgeTypes.has(badge.id)
    );

    // Calculate progress toward unearned badges
    const progress = await calculateBadgeProgress(supabase, user.id, availableBadges);

    const response: BadgeResponse = {
      earned_badges: earnedBadges,
      available_badges: availableBadges,
      progress
    };

    return NextResponse.json(response, { status: 200 });
  })();
}

/**
 * Calculate progress toward unearned badges
 */
async function calculateBadgeProgress(
  supabase: any,
  userId: string,
  availableBadges: BadgeDefinition[]
): Promise<BadgeProgress[]> {
  try {
    // Fetch user session data for progress calculations
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId);

    if (sessionsError) {
      console.error('Error fetching sessions for badge progress:', sessionsError);
      return [];
    }

    const progress: BadgeProgress[] = [];
    const sessionCount = sessions?.length || 0;

    for (const badge of availableBadges) {
      let currentProgress = 0;
      let requiredProgress = 1;

      switch (badge.criteria.type) {
        case 'session_count':
          currentProgress = sessionCount;
          requiredProgress = badge.criteria.threshold || 1;
          break;

        case 'streak_days':
          // For now, we'll set progress to 0 for streak badges
          // This would require more complex streak calculation
          currentProgress = 0;
          requiredProgress = badge.criteria.threshold || 1;
          break;

        case 'pronunciation_score':
        case 'grammar_score':
          // For performance badges, we'll set progress to 0
          // This would require analyzing learning turns data
          currentProgress = 0;
          requiredProgress = 1;
          break;

        case 'special':
          // Special badges have complex criteria, set to 0 for now
          currentProgress = 0;
          requiredProgress = 1;
          break;

        case 'performance_consistency':
          // Performance consistency badges require session analysis
          currentProgress = 0;
          requiredProgress = badge.criteria.conditions?.sessions || 1;
          break;

        default:
          currentProgress = 0;
          requiredProgress = 1;
      }

      const percentage = Math.min(100, Math.round((currentProgress / requiredProgress) * 100));

      progress.push({
        badge_id: badge.id,
        current_progress: currentProgress,
        required_progress: requiredProgress,
        percentage
      });
    }

    return progress;
  } catch (error) {
    console.error('Error calculating badge progress:', error);
    return [];
  }
}