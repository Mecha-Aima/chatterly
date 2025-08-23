'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Trophy, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type EarnedBadge } from '@/app/api/badges/route';
import { type BadgeRarity } from '@/lib/badgeDefinitions';

interface BadgeNotificationProps {
  badges: EarnedBadge[];
  onClose: () => void;
  onViewProfile?: () => void;
  autoCloseDelay?: number;
}

const rarityIcons: Record<BadgeRarity, React.ReactNode> = {
  common: <Trophy className="h-6 w-6" />,
  rare: <Star className="h-6 w-6" />,
  epic: <Zap className="h-6 w-6" />,
  legendary: <Zap className="h-6 w-6" />
};

const rarityColors: Record<BadgeRarity, string> = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600'
};

const rarityGlow: Record<BadgeRarity, string> = {
  common: 'shadow-gray-200/50 dark:shadow-gray-500/20',
  rare: 'shadow-blue-200/50 dark:shadow-blue-500/20',
  epic: 'shadow-purple-200/50 dark:shadow-purple-500/20',
  legendary: 'shadow-yellow-200/50 dark:shadow-yellow-500/20'
};

export function BadgeNotification({ 
  badges, 
  onClose, 
  onViewProfile,
  autoCloseDelay = 8000 
}: BadgeNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (badges.length > 0) {
      setIsVisible(true);
      
      // Auto-close after delay
      const autoCloseTimer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => clearTimeout(autoCloseTimer);
    }
  }, [badges, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const handleViewProfile = () => {
    onViewProfile?.();
    handleClose();
  };

  if (badges.length === 0) return null;

  const isMultiple = badges.length > 1;
  const isManyBadges = badges.length > 4;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300',
      isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    )}>
      <Card className={cn(
        'relative w-full transform transition-all duration-500 shadow-2xl',
        isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4',
        // Responsive sizing based on number of badges
        badges.length === 1 && 'max-w-md',
        badges.length === 2 && 'max-w-2xl',
        badges.length >= 3 && 'max-w-4xl',
        // Celebration animation
        isVisible && 'animate-pulse'
      )}>
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardContent className="p-8">
          {/* Celebration header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg">
              <Trophy className="h-10 w-10" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isMultiple ? 'Badges Earned!' : 'Badge Earned!'}
            </h2>
            
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {isMultiple 
                ? `Congratulations! You've unlocked ${badges.length} new achievements!`
                : 'Congratulations on your new achievement!'
              }
            </p>
          </div>

          {/* Badges grid */}
          <div className={cn(
            'grid gap-6 mb-8',
            // Responsive grid based on number of badges
            badges.length === 1 && 'grid-cols-1 max-w-xs mx-auto',
            badges.length === 2 && 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto',
            badges.length === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto',
            badges.length >= 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-5xl mx-auto'
          )}>
            {badges.map((badge, index) => {
              const rarity = badge.definition.rarity;
              
              return (
                <div
                  key={badge.id}
                  className={cn(
                    'bg-white dark:bg-gray-800 rounded-xl p-6 text-center border-2 shadow-lg transition-all duration-300 hover:scale-105',
                    rarityGlow[rarity],
                    // Rarity-based border colors
                    rarity === 'legendary' && 'border-yellow-300 dark:border-yellow-600',
                    rarity === 'epic' && 'border-purple-300 dark:border-purple-600',
                    rarity === 'rare' && 'border-blue-300 dark:border-blue-600',
                    rarity === 'common' && 'border-gray-300 dark:border-gray-600'
                  )}
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  {/* Badge image container */}
                  <div className="relative mb-4">
                    <div className={cn(
                      'w-16 h-16 mx-auto rounded-full bg-gradient-to-br flex items-center justify-center overflow-hidden shadow-md',
                      rarityColors[rarity]
                    )}>
                      <img 
                        src={badge.definition.imageUrl} 
                        alt={badge.definition.name}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-white text-xl font-bold">
                        {badge.definition.name.charAt(0)}
                      </div>
                    </div>
                    
                    {/* Rarity indicator */}
                    <div className={cn(
                      'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md',
                      rarity === 'legendary' && 'bg-gradient-to-r from-yellow-400 to-yellow-600',
                      rarity === 'epic' && 'bg-gradient-to-r from-purple-400 to-purple-600',
                      rarity === 'rare' && 'bg-gradient-to-r from-blue-400 to-blue-600',
                      rarity === 'common' && 'bg-gradient-to-r from-gray-400 to-gray-600'
                    )}>
                      {rarity === 'legendary' && '★'}
                      {rarity === 'epic' && '◆'}
                      {rarity === 'rare' && '●'}
                      {rarity === 'common' && '○'}
                    </div>
                  </div>

                  {/* Badge info */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                    {badge.definition.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 min-h-[2.5rem]">
                    {badge.definition.description}
                  </p>

                  {/* Badge category */}
                  <div className={cn(
                    'inline-block px-2 py-1 rounded-full text-xs font-medium',
                    badge.definition.category === 'milestone' && 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
                    badge.definition.category === 'streak' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
                    badge.definition.category === 'performance' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                    badge.definition.category === 'special' && 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                  )}>
                    {badge.definition.category.charAt(0).toUpperCase() + badge.definition.category.slice(1)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12"
            >
              Continue Learning
            </Button>
            
            {onViewProfile && (
              <Button
                onClick={handleViewProfile}
                className="flex-1 h-12"
              >
                View All Badges
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}