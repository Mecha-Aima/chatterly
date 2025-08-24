/**
 * Badge Definition System for Chatterly Gamification
 * 
 * This file defines all available badges, their criteria, and metadata.
 * Badge definitions are used by both the frontend for display and the backend
 * for automatic badge awarding through database triggers.
 */

export type BadgeCategory = 'milestone' | 'streak' | 'performance' | 'special';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface BadgeCriteria {
    type: 'session_count' | 'streak_days' | 'pronunciation_score' | 'grammar_score' | 'special' | 'performance_consistency';
    threshold?: number;
    timeframe?: string;
    conditions?: Record<string, any>;
}

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    category: BadgeCategory;
    rarity: BadgeRarity;
    criteria: BadgeCriteria;
}

/**
 * Comprehensive badge definitions organized by category
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    // MILESTONE BADGES - Achievement-based rewards
    {
        id: 'first_session',
        name: 'First Steps',
        description: 'Complete your first learning session',
        imageUrl: '/badges/badge_1.svg',
        category: 'milestone',
        rarity: 'common',
        criteria: { type: 'session_count', threshold: 1 }
    },
    {
        id: 'getting_started',
        name: 'Getting Started',
        description: 'Complete 5 learning sessions',
        imageUrl: '/badges/badge_2.svg',
        category: 'milestone',
        rarity: 'common',
        criteria: { type: 'session_count', threshold: 5 }
    },
    {
        id: 'committed_learner',
        name: 'Committed Learner',
        description: 'Complete 25 learning sessions',
        imageUrl: '/badges/badge_3.svg',
        category: 'milestone',
        rarity: 'rare',
        criteria: { type: 'session_count', threshold: 25 }
    },
    {
        id: 'century_club',
        name: 'Century Club',
        description: 'Complete 100 learning sessions',
        imageUrl: '/badges/badge_4.svg',
        category: 'milestone',
        rarity: 'epic',
        criteria: { type: 'session_count', threshold: 100 }
    },
    {
        id: 'legend',
        name: 'Learning Legend',
        description: 'Complete 500 learning sessions',
        imageUrl: '/badges/badge_5.svg',
        category: 'milestone',
        rarity: 'legendary',
        criteria: { type: 'session_count', threshold: 500 }
    },

    // STREAK BADGES - Consistency rewards
    {
        id: 'three_day_streak',
        name: 'Consistency',
        description: 'Practice for 3 consecutive days',
        imageUrl: '/badges/badge_6.svg',
        category: 'streak',
        rarity: 'common',
        criteria: { type: 'streak_days', threshold: 3 }
    },
    {
        id: '7_day_streak',
        name: 'Week Warrior',
        description: 'Practice for 7 consecutive days',
        imageUrl: '/badges/badge_7.svg',
        category: 'streak',
        rarity: 'rare',
        criteria: { type: 'streak_days', threshold: 7 }
    },
    {
        id: 'month_master',
        name: 'Month Master',
        description: 'Practice for 30 consecutive days',
        imageUrl: '/badges/badge_1.svg',
        category: 'streak',
        rarity: 'epic',
        criteria: { type: 'streak_days', threshold: 30 }
    },
    {
        id: 'streak_legend',
        name: 'Streak Legend',
        description: 'Practice for 100 consecutive days',
        imageUrl: '/badges/badge_2.svg',
        category: 'streak',
        rarity: 'legendary',
        criteria: { type: 'streak_days', threshold: 100 }
    },

    // PERFORMANCE BADGES - Skill-based rewards
    {
        id: 'perfect_pronunciation',
        name: 'Perfect Pronunciation',
        description: 'Achieve 90%+ pronunciation score in a session',
        imageUrl: '/badges/badge_3.svg',
        category: 'performance',
        rarity: 'rare',
        criteria: { type: 'pronunciation_score', threshold: 90 }
    },
    {
        id: 'pronunciation_master',
        name: 'Pronunciation Master',
        description: 'Maintain 90%+ pronunciation score for 10 sessions',
        imageUrl: '/badges/badge_4.svg',
        category: 'performance',
        rarity: 'epic',
        criteria: {
            type: 'performance_consistency',
            threshold: 90,
            conditions: { metric: 'pronunciation', sessions: 10 }
        }
    },
    {
        id: 'grammar_guru',
        name: 'Grammar Guru',
        description: 'Achieve 95%+ grammar score in a session',
        imageUrl: '/badges/badge_5.svg',
        category: 'performance',
        rarity: 'rare',
        criteria: { type: 'grammar_score', threshold: 95 }
    },
    {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Maintain 95%+ overall score for 10 sessions',
        imageUrl: '/badges/badge_6.svg',
        category: 'performance',
        rarity: 'legendary',
        criteria: {
            type: 'performance_consistency',
            threshold: 95,
            conditions: { metric: 'overall', sessions: 10 }
        }
    },
    {
        id: 'sentences_mastered_50',
        name: 'Sentence Master',
        description: 'Master 50 sentences with high accuracy',
        imageUrl: '/badges/badge_7.svg',
        category: 'performance',
        rarity: 'epic',
        criteria: {
            type: 'special',
            conditions: { type: 'sentences_mastered', count: 50, accuracy_threshold: 80 }
        }
    },

    // SPECIAL BADGES - Creative and unique achievements
    {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Complete 5 sessions before 9 AM',
        imageUrl: '/badges/badge_1.svg',
        category: 'special',
        rarity: 'rare',
        criteria: {
            type: 'special',
            conditions: { type: 'time_based', time_before: '09:00', count: 5 }
        }
    },
    {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Complete 5 sessions after 9 PM',
        imageUrl: '/badges/badge_2.svg',
        category: 'special',
        rarity: 'rare',
        criteria: {
            type: 'special',
            conditions: { type: 'time_based', time_after: '21:00', count: 5 }
        }
    },
    {
        id: 'polyglot',
        name: 'Polyglot',
        description: 'Practice 3 or more different languages',
        imageUrl: '/badges/badge_3.svg',
        category: 'special',
        rarity: 'epic',
        criteria: {
            type: 'special',
            conditions: { type: 'multi_language', count: 3 }
        }
    },
    {
        id: 'quick_learner',
        name: 'Quick Learner',
        description: 'Complete 5 sessions in a single day',
        imageUrl: '/badges/badge_4.svg',
        category: 'special',
        rarity: 'rare',
        criteria: {
            type: 'special',
            conditions: { type: 'daily_sessions', count: 5 }
        }
    },
    {
        id: 'weekend_warrior',
        name: 'Weekend Warrior',
        description: 'Complete sessions on 10 different weekends',
        imageUrl: '/badges/badge_5.svg',
        category: 'special',
        rarity: 'epic',
        criteria: {
            type: 'special',
            conditions: { type: 'weekend_sessions', count: 10 }
        }
    },
    {
        id: 'marathon_learner',
        name: 'Marathon Learner',
        description: 'Complete a session lasting over 30 minutes',
        imageUrl: '/badges/badge_6.svg',
        category: 'special',
        rarity: 'rare',
        criteria: {
            type: 'special',
            conditions: { type: 'session_duration', minutes: 30 }
        }
    }
];

/**
 * Get badge definition by ID
 */
export function getBadgeDefinition(badgeId: string): BadgeDefinition | undefined {
    return BADGE_DEFINITIONS.find(badge => badge.id === badgeId);
}

/**
 * Get all badge definitions by category
 */
export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
    return BADGE_DEFINITIONS.filter(badge => badge.category === category);
}

/**
 * Get all badge definitions by rarity
 */
export function getBadgesByRarity(rarity: BadgeRarity): BadgeDefinition[] {
    return BADGE_DEFINITIONS.filter(badge => badge.rarity === rarity);
}

/**
 * Get all available badge IDs
 */
export function getAllBadgeIds(): string[] {
    return BADGE_DEFINITIONS.map(badge => badge.id);
}

