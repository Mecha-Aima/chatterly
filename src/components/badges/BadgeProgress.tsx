import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type BadgeProgress as BadgeProgressType } from '@/app/api/badges/route';
import { type BadgeDefinition, getBadgeDefinition, type BadgeRarity } from '@/lib/badgeDefinitions';

interface BadgeProgressProps {
  progress: BadgeProgressType[];
  availableBadges: BadgeDefinition[];
  className?: string;
  showAll?: boolean;
  maxItems?: number;
}

const rarityColors: Record<BadgeRarity, string> = {
  common: 'bg-gray-200 dark:bg-gray-700',
  rare: 'bg-blue-200 dark:bg-blue-700',
  epic: 'bg-purple-200 dark:bg-purple-700',
  legendary: 'bg-yellow-200 dark:bg-yellow-700'
};

export function BadgeProgress({ 
  progress, 
  availableBadges, 
  className, 
  showAll = false, 
  maxItems = 6 
}: BadgeProgressProps) {
  // Sort progress by percentage (highest first) and filter out 0% progress unless showAll is true
  const sortedProgress = progress
    .filter(p => showAll || p.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, showAll ? undefined : maxItems);

  if (sortedProgress.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Complete more sessions to unlock badge progress!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Badge Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedProgress.map((progressItem) => {
          const badge = availableBadges.find(b => b.id === progressItem.badge_id);
          if (!badge) return null;

          return (
            <div key={progressItem.badge_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Badge Icon */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
                    <img 
                      src={badge.imageUrl} 
                      alt={badge.name}
                      className="w-6 h-6 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden text-sm">
                      {badge.category === 'milestone' && '🏆'}
                      {badge.category === 'streak' && '🔥'}
                      {badge.category === 'performance' && '⭐'}
                      {badge.category === 'special' && '🎯'}
                    </div>
                  </div>
                  
                  {/* Badge Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{badge.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Progress Percentage */}
                <div className="text-sm font-medium text-right flex-shrink-0">
                  {progressItem.percentage}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    rarityColors[badge.rarity]
                  )}
                  style={{ width: `${progressItem.percentage}%` }}
                />
              </div>

              {/* Progress Details */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {progressItem.current_progress} / {progressItem.required_progress}
                </span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-xs font-medium',
                  badge.rarity === 'common' && 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                  badge.rarity === 'rare' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
                  badge.rarity === 'epic' && 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
                  badge.rarity === 'legendary' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                )}>
                  {badge.rarity}
                </span>
              </div>
            </div>
          );
        })}

        {!showAll && progress.length > maxItems && (
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">
              +{progress.length - maxItems} more badges available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}