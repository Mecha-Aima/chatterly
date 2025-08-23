import { type EarnedBadge } from '@/app/api/badges/route';

/**
 * Check for newly earned badges by comparing current badges with previously stored badges
 */
export function getNewlyEarnedBadges(
  currentBadges: EarnedBadge[],
  previousBadges: EarnedBadge[] = []
): EarnedBadge[] {
  const previousBadgeIds = new Set(previousBadges.map(badge => badge.id));
  
  return currentBadges.filter(badge => !previousBadgeIds.has(badge.id));
}

/**
 * Store badges in session storage for comparison
 */
export function storeBadgesForComparison(badges: EarnedBadge[]): void {
  try {
    const badgeData = badges.map(badge => ({
      id: badge.id,
      badge_type: badge.badge_type,
      awarded_at: badge.awarded_at
    }));
    
    sessionStorage.setItem('user_badges', JSON.stringify(badgeData));
  } catch (error) {
    console.warn('Failed to store badges in session storage:', error);
  }
}

/**
 * Retrieve previously stored badges from session storage
 */
export function getPreviouslyStoredBadges(): EarnedBadge[] {
  try {
    const stored = sessionStorage.getItem('user_badges');
    if (!stored) return [];
    
    const badgeData = JSON.parse(stored);
    return Array.isArray(badgeData) ? badgeData : [];
  } catch (error) {
    console.warn('Failed to retrieve badges from session storage:', error);
    return [];
  }
}

/**
 * Check for new badges and return them if found
 */
export async function checkForNewBadges(): Promise<EarnedBadge[]> {
  try {
    // Fetch current badges
    const response = await fetch('/api/badges');
    if (!response.ok) {
      throw new Error('Failed to fetch badges');
    }
    
    const data = await response.json();
    const currentBadges = data.earned_badges || [];
    
    // Get previously stored badges
    const previousBadges = getPreviouslyStoredBadges();
    
    // Find newly earned badges
    const newBadges = getNewlyEarnedBadges(currentBadges, previousBadges);
    
    // Store current badges for next comparison
    storeBadgesForComparison(currentBadges);
    
    return newBadges;
  } catch (error) {
    console.error('Error checking for new badges:', error);
    return [];
  }
}

/**
 * Filter badges earned within the last few minutes (for session completion)
 */
export function getRecentlyEarnedBadges(
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