import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { BadgeCard } from './BadgeCard';
import { type EarnedBadge } from '@/app/api/badges/route';
import { type BadgeDefinition } from '@/lib/badgeDefinitions';
import { type BadgeCategory, type BadgeRarity } from '@/lib/badgeDefinitions';

interface BadgeDisplayProps {
  badges: EarnedBadge[];
  availableBadges?: BadgeDefinition[];
  layout?: 'grid' | 'list';
  showProgress?: boolean;
  showFilters?: boolean;
  className?: string;
}

type FilterType = 'all' | BadgeCategory | BadgeRarity;

const categoryFilters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Badges' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'streak', label: 'Streaks' },
  { value: 'performance', label: 'Performance' },
  { value: 'special', label: 'Special' }
];

const rarityFilters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Rarities' },
  { value: 'common', label: 'Common' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' }
];

export function BadgeDisplay({ 
  badges, 
  availableBadges = [], 
  layout = 'grid', 
  showProgress = false,
  showFilters = true,
  className 
}: BadgeDisplayProps) {
  const [categoryFilter, setCategoryFilter] = useState<FilterType>('all');
  const [rarityFilter, setRarityFilter] = useState<FilterType>('all');
  const [showAvailable, setShowAvailable] = useState(false);

  // Filter earned badges
  const filteredEarnedBadges = badges.filter(badge => {
    const definition = badge.definition;
    
    const categoryMatch = categoryFilter === 'all' || definition.category === categoryFilter;
    const rarityMatch = rarityFilter === 'all' || definition.rarity === rarityFilter;
    
    return categoryMatch && rarityMatch;
  });

  // Filter available badges if showing them
  const filteredAvailableBadges = showAvailable ? availableBadges.filter(badge => {
    const categoryMatch = categoryFilter === 'all' || badge.category === categoryFilter;
    const rarityMatch = rarityFilter === 'all' || badge.rarity === rarityFilter;
    
    return categoryMatch && rarityMatch;
  }) : [];

  const allFilteredBadges = [
    ...filteredEarnedBadges.map(badge => ({ ...badge, isEarned: true })),
    ...filteredAvailableBadges.map(badge => ({ ...badge, isEarned: false }))
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Your Badges</h2>
          <p className="text-muted-foreground">
            {badges.length} earned • {availableBadges.length} available
          </p>
        </div>
        
        {/* Toggle Available Badges */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Show Available</label>
          <input
            type="checkbox"
            checked={showAvailable}
            onChange={(e) => setShowAvailable(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FilterType)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {categoryFilters.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rarity Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rarity</label>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as FilterType)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {rarityFilters.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Badge Grid/List */}
      {allFilteredBadges.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold mb-2">No badges found</h3>
          <p className="text-muted-foreground">
            {badges.length === 0 
              ? "Complete your first learning session to earn your first badge!"
              : "Try adjusting your filters to see more badges."
            }
          </p>
        </div>
      ) : (
        <div className={cn(
          layout === 'grid' 
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
            : 'space-y-4'
        )}>
          {allFilteredBadges.map((badge) => (
            <BadgeCard
              key={badge.isEarned ? `earned-${badge.id}` : `available-${badge.id}`}
              badge={badge}
              isEarned={badge.isEarned}
              className={layout === 'list' ? 'max-w-sm' : ''}
            />
          ))}
        </div>
      )}

      {/* Category Breakdown */}
      {badges.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t">
          {categoryFilters.slice(1).map(category => {
            const count = badges.filter(badge => badge.definition.category === category.value).length;
            return (
              <div key={category.value} className="text-center">
                <div className="text-2xl font-bold text-primary">{count}</div>
                <div className="text-sm text-muted-foreground">{category.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}