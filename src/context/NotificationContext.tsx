'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BadgeNotification } from '@/components/notifications/BadgeNotification';
import { ProgressUpdate } from '@/components/notifications/ProgressUpdate';
import { type EarnedBadge } from '@/app/api/badges/route';

interface ProgressMetric {
  label: string;
  previousValue: number;
  currentValue: number;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface NotificationContextType {
  showBadgeNotification: (badges: EarnedBadge[]) => void;
  showProgressUpdate: (metrics: ProgressMetric[], title?: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  onViewProfile?: () => void;
}

export function NotificationProvider({ children, onViewProfile }: NotificationProviderProps) {
  const [badgeNotifications, setBadgeNotifications] = useState<EarnedBadge[]>([]);
  const [progressMetrics, setProgressMetrics] = useState<{ metrics: ProgressMetric[]; title?: string }>({ metrics: [] });

  const showBadgeNotification = useCallback((badges: EarnedBadge[]) => {
    if (badges.length > 0) {
      setBadgeNotifications(badges);
    }
  }, []);

  const showProgressUpdate = useCallback((metrics: ProgressMetric[], title?: string) => {
    if (metrics.length > 0) {
      setProgressMetrics({ metrics, title });
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setBadgeNotifications([]);
  }, []);

  const clearProgressUpdate = useCallback(() => {
    setProgressMetrics({ metrics: [] });
  }, []);

  return (
    <NotificationContext.Provider value={{ showBadgeNotification, showProgressUpdate, clearNotifications }}>
      {children}
      
      {/* Badge notification overlay */}
      {badgeNotifications.length > 0 && (
        <BadgeNotification
          badges={badgeNotifications}
          onClose={clearNotifications}
          onViewProfile={onViewProfile}
        />
      )}

      {/* Progress update notification */}
      {progressMetrics.metrics.length > 0 && (
        <ProgressUpdate
          metrics={progressMetrics.metrics}
          title={progressMetrics.title}
          onClose={clearProgressUpdate}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}