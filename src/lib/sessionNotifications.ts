import { type EarnedBadge } from '@/app/api/badges/route';

/**
 * Handle post-session completion notifications
 * This should be called after a session is completed to check for badges and show progress
 */
export async function handleSessionCompletionNotifications(sessionId: string) {
  try {
    // Small delay to ensure database triggers have completed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for newly earned badges
    const badgeResponse = await fetch('/api/badges');
    if (!badgeResponse.ok) {
      throw new Error('Failed to fetch badges');
    }
    
    const badgeData = await badgeResponse.json();
    const currentBadges = badgeData.earned_badges || [];
    
    // Get recently earned badges (within last 2 minutes to account for session completion)
    const recentBadges = getRecentlyEarnedBadges(currentBadges, 2);
    
    return {
      newBadges: recentBadges,
      totalBadges: currentBadges.length
    };
    
  } catch (error) {
    console.error('Error handling session completion notifications:', error);
    return {
      newBadges: [],
      totalBadges: 0
    };
  }
}

/**
 * Filter badges earned within the specified time threshold
 */
function getRecentlyEarnedBadges(
  badges: EarnedBadge[],
  minutesThreshold: number = 5
): EarnedBadge[] {
  const thresholdTime = new Date(Date.now() - minutesThreshold * 60 * 1000);
  
  return badges.filter(badge => {
    if (!badge.awarded_at) return false;
    
    const awardedTime = new Date(badge.awarded_at);
    return awardedTime >= thresholdTime;
  });
}

/**
 * Create a session completion notification payload
 */
export function createSessionCompletionPayload(sessionSummary: any) {
  return {
    type: 'session_complete',
    data: {
      completion_rate: sessionSummary.completion_rate,
      average_pronunciation_score: sessionSummary.average_pronunciation_score,
      average_grammar_score: sessionSummary.average_grammar_score,
      duration_minutes: sessionSummary.duration_minutes,
      message: sessionSummary.message
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Utility to trigger notifications in client components
 * This can be used in React components that need to show notifications
 */
export function triggerSessionNotifications(
  sessionSummary: any,
  showBadgeNotification: (badges: EarnedBadge[]) => void,
  showProgressUpdate: (metrics: any[], title?: string) => void
) {
  // Check for new badges
  handleSessionCompletionNotifications('').then(result => {
    if (result.newBadges.length > 0) {
      showBadgeNotification(result.newBadges);
    }
  });
  
  // Show progress update
  const metrics: any[] = [];
  
  if (sessionSummary.completion_rate !== undefined) {
    metrics.push({
      label: 'Completion Rate',
      previousValue: 0,
      currentValue: Math.round(sessionSummary.completion_rate),
      unit: '%'
    });
  }
  
  if (sessionSummary.average_pronunciation_score !== undefined) {
    metrics.push({
      label: 'Pronunciation',
      previousValue: 0,
      currentValue: Math.round(sessionSummary.average_pronunciation_score),
      unit: '%'
    });
  }
  
  if (sessionSummary.average_grammar_score !== undefined) {
    metrics.push({
      label: 'Grammar',
      previousValue: 0,
      currentValue: Math.round(sessionSummary.average_grammar_score),
      unit: '%'
    });
  }
  
  if (metrics.length > 0) {
    // Delay progress update slightly so badge notification shows first
    setTimeout(() => {
      showProgressUpdate(metrics, 'Session Complete!');
    }, 2000);
  }
}