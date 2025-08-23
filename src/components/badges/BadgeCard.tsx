import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type EarnedBadge } from '@/app/api/badges/route';
import { type BadgeDefinition, type BadgeRarity } from '@/lib/badgeDefinitions';

interface BadgeCardProps {
  badge: EarnedBadge | BadgeDefinition;
  isEarned?: boolean;
  awardedAt?: string | null;
  className?: string;
}

const rarityStyles: Record<BadgeRarity, string> = {
  common: 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800',
  rare: 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20',
  epic: 'border-purple-300 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20',
  legendary: 'border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/20'
};

const rarityGlow: Record<BadgeRarity, string> = {
  common: '',
  rare: 'shadow-blue-200/50 dark:shadow-blue-500/20',
  epic: 'shadow-purple-200/50 dark:shadow-purple-500/20',
  legendary: 'shadow-yellow-200/50 dark:shadow-yellow-500/20'
};

export function BadgeCard({ badge, isEarned = false, awardedAt, className }: BadgeCardProps) {
  const definition = 'definition' in badge ? badge.definition : badge;
  const earnedDate = isEarned && 'awarded_at' in badge ? badge.awarded_at : awardedAt;
  
  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all duration-200 hover:scale-105',
        rarityStyles[definition.rarity],
        definition.rarity !== 'common' && rarityGlow[definition.rarity],
        !isEarned && 'opacity-60 grayscale',
        className
      )}
    >
      <CardContent className="p-4 text-center">
        {/* Badge Image */}
        <div className="relative mb-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden">
            {/* Placeholder for badge image */}
            <img 
              src={definition.imageUrl} 
              alt={definition.name}
              className="w-12 h-12 object-cover"
              onError={(e) => {
                // Fallback to emoji or icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden text-2xl">
              {definition.category === 'milestone' && '🏆'}
              {definition.category === 'streak' && '🔥'}
              {definition.category === 'performance' && '⭐'}
              {definition.category === 'special' && '🎯'}
            </div>
          </div>
          
          {/* Rarity indicator */}
          {definition.rarity !== 'common' && (
            <div className={cn(
              'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              definition.rarity === 'rare' && 'bg-blue-500 text-white',
              definition.rarity === 'epic' && 'bg-purple-500 text-white',
              definition.rarity === 'legendary' && 'bg-yellow-500 text-black'
            )}>
              {definition.rarity === 'rare' && 'R'}
              {definition.rarity === 'epic' && 'E'}
              {definition.rarity === 'legendary' && 'L'}
            </div>
          )}
        </div>

        {/* Badge Name */}
        <h3 className="font-semibold text-sm mb-1 line-clamp-1">
          {definition.name}
        </h3>

        {/* Badge Description */}
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {definition.description}
        </p>

        {/* Award Date */}
        {isEarned && earnedDate && (
          <p className="text-xs text-muted-foreground">
            Earned {new Date(earnedDate).toLocaleDateString()}
          </p>
        )}

        {/* Category Badge */}
        <div className={cn(
          'inline-block px-2 py-1 rounded-full text-xs font-medium mt-2',
          definition.category === 'milestone' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
          definition.category === 'streak' && 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
          definition.category === 'performance' && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
          definition.category === 'special' && 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300'
        )}>
          {definition.category}
        </div>
      </CardContent>
    </Card>
  );
}