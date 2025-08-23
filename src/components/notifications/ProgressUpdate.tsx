'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressMetric {
  label: string;
  previousValue: number;
  currentValue: number;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface ProgressUpdateProps {
  metrics: ProgressMetric[];
  onClose: () => void;
  title?: string;
  autoCloseDelay?: number;
}

export function ProgressUpdate({ 
  metrics, 
  onClose, 
  title = "Progress Updated!",
  autoCloseDelay = 5000 
}: ProgressUpdateProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (metrics.length > 0) {
      setIsVisible(true);
      
      // Auto-close after delay
      const autoCloseTimer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => clearTimeout(autoCloseTimer);
    }
  }, [metrics, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  if (metrics.length === 0) return null;

  return (
    <div className={cn(
      'fixed top-4 right-4 z-40 transform transition-all duration-300',
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
    )}>
      <Card className="w-80 shadow-lg border-l-4 border-l-blue-500">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="h-3 w-3" />
        </Button>

        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>

          {/* Progress metrics */}
          <div className="space-y-3">
            {metrics.map((metric, index) => {
              const change = metric.currentValue - metric.previousValue;
              const isPositive = change > 0;
              const isNegative = change < 0;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {metric.icon || <Target className="h-4 w-4 text-gray-500" />}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {metric.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {metric.currentValue}{metric.unit || ''}
                    </span>
                    
                    {change !== 0 && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full font-medium',
                        isPositive && 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                        isNegative && 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      )}>
                        {isPositive ? '+' : ''}{change}{metric.unit || ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Celebration for significant improvements */}
          {metrics.some(m => (m.currentValue - m.previousValue) > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-medium">Keep up the great work!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}