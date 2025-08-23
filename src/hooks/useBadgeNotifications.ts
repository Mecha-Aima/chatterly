'use client';

import React, { useCallback } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { checkForNewBadges, getRecentlyEarnedBadges } from '@/lib/badgeNotifications';
import { Target, TrendingUp, Zap, Award } from 'lucide-react';

interface ProgressMetric {
  label: string;
  previousValue: number;
  currentValue: number;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
}

export function useBadgeNotifications() {
  const { showBadgeNotification, showProgressUpdate } = useNotifications();

  /**
   * Check for and display newly earned badges
   */
  const checkAndShowNewBadges = useCallback(async () => {
    try {
      const newBadges = await checkForNewBadges();
      
      if (newBadges.length > 0) {
        showBadgeNotification(newBadges);
      }
      
      return newBadges;
    } catch (error) {
      console.error('Error checking for new badges:', error);
      return [];
    }
  }, [showBadgeNotification]);

  /**
   * Check for badges earned in the last few minutes (useful after session completion)
   */
  const checkAndShowRecentBadges = useCallback(async (minutesThreshold: number = 5) => {
    try {
      // Fetch current badges
      const response = await fetch('/api/badges');
      if (!response.ok) {
        throw new Error('Failed to fetch badges');
      }
      
      const data = await response.json();
      const currentBadges = data.earned_badges || [];
      
      // Filter for recently earned badges
      const recentBadges = getRecentlyEarnedBadges(currentBadges, minutesThreshold);
      
      if (recentBadges.length > 0) {
        showBadgeNotification(recentBadges);
      }
      
      return recentBadges;
    } catch (error) {
      console.error('Error checking for recent badges:', error);
      return [];
    }
  }, [showBadgeNotification]);

  /**
   * Show progress updates after session completion
   */
  const showSessionProgressUpdate = useCallback(async (sessionSummary: any) => {
    try {
      // Fetch current progress to compare
      const response = await fetch('/api/progress');
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }
      
      const progressData = await response.json();
      
      // Create progress metrics from session summary
      const metrics: ProgressMetric[] = [];
      
      if (sessionSummary.completion_rate !== undefined) {
        metrics.push({
          label: 'Session Completion',
          previousValue: 0,
          currentValue: Math.round(sessionSummary.completion_rate),
          unit: '%',
          icon: React.createElement(Target, { className: "h-4 w-4 text-green-500" })
        });
      }
      
      if (sessionSummary.average_pronunciation_score !== undefined) {
        metrics.push({
          label: 'Pronunciation Score',
          previousValue: 0,
          currentValue: Math.round(sessionSummary.average_pronunciation_score),
          unit: '%',
          icon: React.createElement(TrendingUp, { className: "h-4 w-4 text-blue-500" })
        });
      }
      
      if (sessionSummary.average_grammar_score !== undefined) {
        metrics.push({
          label: 'Grammar Score',
          previousValue: 0,
          currentValue: Math.round(sessionSummary.average_grammar_score),
          unit: '%',
          icon: React.createElement(Award, { className: "h-4 w-4 text-purple-500" })
        });
      }
      
      if (sessionSummary.duration_minutes !== undefined) {
        metrics.push({
          label: 'Session Duration',
          previousValue: 0,
          currentValue: sessionSummary.duration_minutes,
          unit: ' min',
          icon: React.createElement(Zap, { className: "h-4 w-4 text-orange-500" })
        });
      }
      
      if (metrics.length > 0) {
        showProgressUpdate(metrics, 'Session Complete!');
      }
      
    } catch (error) {
      console.error('Error showing session progress update:', error);
    }
  }, [showProgressUpdate]);

  /**
   * Manually trigger badge notification for specific badges
   */
  const showBadges = useCallback((badges: any[]) => {
    if (badges.length > 0) {
      showBadgeNotification(badges);
    }
  }, [showBadgeNotification]);

  return {
    checkAndShowNewBadges,
    checkAndShowRecentBadges,
    showSessionProgressUpdate,
    showBadges
  };
}