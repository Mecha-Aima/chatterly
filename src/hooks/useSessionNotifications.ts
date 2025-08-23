'use client';

import { useCallback } from 'react';
import { useBadgeNotifications } from './useBadgeNotifications';
import { handleSessionCompletionNotifications } from '@/lib/sessionNotifications';

export function useSessionNotifications() {
  const { checkAndShowRecentBadges, showSessionProgressUpdate } = useBadgeNotifications();

  /**
   * Handle all notifications after session completion
   */
  const handleSessionComplete = useCallback(async (sessionSummary: any) => {
    try {
      // Show immediate progress update
      await showSessionProgressUpdate(sessionSummary);
      
      // Check for new badges after a short delay to ensure DB triggers have run
      setTimeout(async () => {
        await checkAndShowRecentBadges(2); // Check for badges earned in last 2 minutes
      }, 1500);
      
    } catch (error) {
      console.error('Error handling session completion notifications:', error);
    }
  }, [showSessionProgressUpdate, checkAndShowRecentBadges]);

  /**
   * Handle notifications when user manually checks progress
   */
  const refreshNotifications = useCallback(async () => {
    try {
      await checkAndShowRecentBadges(10); // Check for badges earned in last 10 minutes
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, [checkAndShowRecentBadges]);

  return {
    handleSessionComplete,
    refreshNotifications
  };
}