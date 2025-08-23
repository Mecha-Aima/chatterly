'use client';

import { useState, useEffect, useCallback } from 'react';
import { BadgeResponse } from '@/app/api/badges/route';
import { ProgressResponse } from '@/app/api/progress/route';

interface DashboardData {
  badges: BadgeResponse | null;
  progress: ProgressResponse | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    badges: null,
    progress: null,
    loading: true,
    error: null
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [badgesResponse, progressResponse] = await Promise.all([
        fetch('/api/badges', {
          credentials: 'include', // Ensure cookies are included
        }),
        fetch('/api/progress', {
          credentials: 'include', // Ensure cookies are included
        })
      ]);

      if (!badgesResponse.ok || !progressResponse.ok) {
        const badgesError = !badgesResponse.ok ? await badgesResponse.text() : null;
        const progressError = !progressResponse.ok ? await progressResponse.text() : null;
        console.error('API Error details:', { badgesError, progressError });
        throw new Error('Failed to fetch dashboard data');
      }

      const [badges, progress] = await Promise.all([
        badgesResponse.json(),
        progressResponse.json()
      ]);

      setData({
        badges,
        progress,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    ...data,
    refetch: fetchDashboardData
  };
}