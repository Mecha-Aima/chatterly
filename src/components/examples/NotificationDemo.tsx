'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useNotifications } from '@/context/NotificationContext';
import { useBadgeNotifications } from '@/hooks/useBadgeNotifications';
import { useSessionNotifications } from '@/hooks/useSessionNotifications';

/**
 * Demo component showing how to use the notification system
 * This is for demonstration purposes and can be removed in production
 */
export function NotificationDemo() {
  const { showBadgeNotification, showProgressUpdate } = useNotifications();
  const { checkAndShowNewBadges } = useBadgeNotifications();
  const { handleSessionComplete } = useSessionNotifications();

  // Demo badge data
  const demoBadges = [
    {
      id: 'demo-badge-1',
      badge_type: 'first_session',
      awarded_at: new Date().toISOString(),
      badge_data: null,
      definition: {
        id: 'first_session',
        name: 'First Steps',
        description: 'Complete your first learning session',
        imageUrl: '/badges/first-steps.png',
        category: 'milestone' as const,
        rarity: 'common' as const,
        criteria: { type: 'session_count' as const, threshold: 1 }
      }
    },
    {
      id: 'demo-badge-2',
      badge_type: 'quick_learner',
      awarded_at: new Date().toISOString(),
      badge_data: null,
      definition: {
        id: 'quick_learner',
        name: 'Quick Learner',
        description: 'Complete 5 sessions in a single day',
        imageUrl: '/badges/quick-learner.png',
        category: 'special' as const,
        rarity: 'rare' as const,
        criteria: { type: 'special' as const }
      }
    },
    {
      id: 'demo-badge-3',
      badge_type: 'perfect_pronunciation',
      awarded_at: new Date().toISOString(),
      badge_data: null,
      definition: {
        id: 'perfect_pronunciation',
        name: 'Perfect Pronunciation',
        description: 'Achieve 95%+ pronunciation accuracy in a session',
        imageUrl: '/badges/perfect-pronunciation.png',
        category: 'performance' as const,
        rarity: 'epic' as const,
        criteria: { type: 'pronunciation_score' as const, threshold: 95 }
      }
    }
  ];

  // Demo session summary
  const demoSessionSummary = {
    completion_rate: 85,
    average_pronunciation_score: 78,
    average_grammar_score: 92,
    duration_minutes: 15,
    message: 'Great job on your session!'
  };

  const handleSingleBadge = () => {
    showBadgeNotification([demoBadges[0]]);
  };

  const handleMultipleBadges = () => {
    showBadgeNotification(demoBadges);
  };

  const handleDemoProgress = () => {
    const metrics = [
      {
        label: 'Session Completion',
        previousValue: 70,
        currentValue: 85,
        unit: '%'
      },
      {
        label: 'Pronunciation Score',
        previousValue: 65,
        currentValue: 78,
        unit: '%'
      }
    ];
    showProgressUpdate(metrics, 'Progress Update!');
  };

  const handleDemoSessionComplete = () => {
    handleSessionComplete(demoSessionSummary);
  };

  const handleCheckNewBadges = () => {
    checkAndShowNewBadges();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h3 className="text-lg font-semibold">Notification System Demo</h3>
        <p className="text-sm text-gray-600">Test the badge and progress notifications</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleSingleBadge} className="w-full">
          Show Single Badge
        </Button>
        
        <Button onClick={handleMultipleBadges} className="w-full">
          Show Multiple Badges
        </Button>
        
        <Button onClick={handleDemoProgress} variant="outline" className="w-full">
          Show Progress Update
        </Button>
        
        <Button onClick={handleDemoSessionComplete} variant="outline" className="w-full">
          Demo Session Complete
        </Button>
        
        <Button onClick={handleCheckNewBadges} variant="outline" className="w-full">
          Check for New Badges
        </Button>
      </CardContent>
    </Card>
  );
}