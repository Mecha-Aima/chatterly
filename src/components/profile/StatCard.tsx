import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'improving' | 'stable' | 'declining';
  subtitle?: string;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle, 
  className 
}: StatCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-500';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <Card className={cn(
      "border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {icon && (
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  {icon}
                </div>
              )}
              <p className="text-sm font-medium text-gray-600">{title}</p>
            </div>
            
            <div className="flex items-baseline space-x-2">
              <p className={cn(
                "text-2xl font-bold",
                getTrendColor()
              )}>
                {value}
              </p>
              {trend && getTrendIcon()}
            </div>
            
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}