import React from 'react';
import { StatCard } from './StatCard';
import { 
  BookOpen, 
  Target, 
  Flame, 
  Clock, 
  TrendingUp,
  MessageCircle,
  CheckCircle,
  Globe,
  Calendar
} from 'lucide-react';
import type { ProgressResponse } from '@/app/api/progress/route';

export interface ProgressStatsProps {
  progress: ProgressResponse;
  className?: string;
}

export function ProgressStats({ progress, className }: ProgressStatsProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`;
  };

  const getStreakSubtitle = (): string => {
    if (progress.overall_stats.current_streak === 0) {
      return 'Start a new streak today!';
    }
    if (progress.overall_stats.current_streak === 1) {
      return 'Keep it going!';
    }
    return `Best: ${progress.overall_stats.longest_streak} days`;
  };

  const getSessionsSubtitle = (): string => {
    const completionRate = progress.performance_metrics.completion_rate;
    if (completionRate >= 90) {
      return 'Excellent completion rate!';
    }
    if (completionRate >= 70) {
      return 'Good completion rate';
    }
    return 'Room for improvement';
  };

  const getLanguageSubtitle = (): string => {
    const count = progress.language_stats.languages_practiced.length;
    if (count === 0) return 'No languages yet';
    if (count === 1) return '1 language';
    return `${count} languages`;
  };

  return (
    <div className={className}>
      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Lessons"
          value={progress.overall_stats.total_sessions}
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          subtitle={getSessionsSubtitle()}
        />
        
        <StatCard
          title="Current Streak"
          value={`${progress.overall_stats.current_streak} days`}
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          subtitle={getStreakSubtitle()}
        />
        
        <StatCard
          title="Learning Time"
          value={formatDuration(progress.overall_stats.total_learning_time)}
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          subtitle={`Avg: ${formatDuration(progress.detailed_metrics.average_session_duration)}/session`}
        />
        
        <StatCard
          title="Completion Rate"
          value={formatPercentage(progress.performance_metrics.completion_rate)}
          icon={<Target className="h-5 w-5 text-green-500" />}
          trend={progress.performance_metrics.improvement_trend}
          subtitle={`${progress.overall_stats.completed_sessions}/${progress.overall_stats.total_sessions} completed`}
        />
      </div>

      {/* Performance Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Pronunciation Score"
          value={formatPercentage(progress.performance_metrics.average_pronunciation_score)}
          icon={<MessageCircle className="h-5 w-5 text-purple-500" />}
          trend={progress.detailed_metrics.pronunciation_trend}
          subtitle="Average across all lessons"
        />
        
        <StatCard
          title="Grammar Score"
          value={formatPercentage(progress.performance_metrics.average_grammar_score)}
          icon={<CheckCircle className="h-5 w-5 text-indigo-500" />}
          trend={progress.detailed_metrics.grammar_trend}
          subtitle="Average accuracy"
        />
        
        <StatCard
          title="Learning Velocity"
          value={`${progress.performance_metrics.learning_velocity.toFixed(1)}`}
          icon={<TrendingUp className="h-5 w-5 text-cyan-500" />}
          subtitle="Lessons per week"
        />
        
        <StatCard
          title="Languages"
          value={progress.overall_stats.favorite_language || 'None'}
          icon={<Globe className="h-5 w-5 text-emerald-500" />}
          subtitle={getLanguageSubtitle()}
        />
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="This Week"
          value={`${progress.recent_activity.sessions_this_week} lessons`}
          icon={<Calendar className="h-5 w-5 text-blue-600" />}
          subtitle="Keep up the momentum!"
        />
        
        <StatCard
          title="This Month"
          value={`${progress.recent_activity.sessions_this_month} lessons`}
          icon={<BookOpen className="h-5 w-5 text-green-600" />}
          subtitle={`${progress.recent_activity.badges_earned_this_month} badges earned`}
        />
        
        <StatCard
          title="Last Lesson"
          value={
            progress.recent_activity.last_session_date
              ? new Date(progress.recent_activity.last_session_date).toLocaleDateString()
              : 'Never'
          }
          icon={<Clock className="h-5 w-5 text-gray-600" />}
          subtitle={
            progress.recent_activity.last_session_date
              ? 'Great job staying active!'
              : 'Ready to start?'
          }
        />
      </div>
    </div>
  );
}