'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, MessageCircle, User, Settings, Calendar, Award, TrendingUp, Target, Flame, Trophy } from 'lucide-react';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const { badges, progress, loading: dataLoading } = useDashboardData();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Chatterly</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome back, {user.email?.split('@')[0]}!</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to your Dashboard!
          </h2>
          <p className="text-gray-600">
            Ready to continue your language learning journey? Let's get started.
          </p>
        </div>

                {/* Main Dashboard Layout */}
        <div className="space-y-8">
          {/* Top Row - Learning Progress and Recent Achievements */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Learning Progress Section */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full gap-16">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <span>Learning Progress</span>
                  </CardTitle>
                  <CardDescription>Track your language learning journey and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {dataLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Loading your progress...</p>
                    </div>
                  ) : progress && progress.overall_stats.total_sessions > 0 ? (
                    <div className="space-y-6">


                      {/* Progress Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <div className="flex items-center justify-center mb-2">
                            <Target className="h-5 w-5 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-blue-900">Lessons</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-900">{progress.overall_stats.completed_sessions}</p>
                          <p className="text-xs text-blue-700 mt-1">Completed</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                          <div className="flex items-center justify-center mb-2">
                            <Flame className="h-5 w-5 text-orange-600 mr-2" />
                            <span className="text-sm font-medium text-orange-900">Streak</span>
                          </div>
                          <p className="text-2xl font-bold text-orange-900">{progress.overall_stats.current_streak}</p>
                          <p className="text-xs text-orange-700 mt-1">Days</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                          <div className="flex items-center justify-center mb-2">
                            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-green-900">Accuracy</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900">{Math.round(progress.performance_metrics.average_pronunciation_score)}%</p>
                          <p className="text-xs text-green-700 mt-1">Average</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                          <div className="flex items-center justify-center mb-2">
                            <Trophy className="h-5 w-5 text-purple-600 mr-2" />
                            <span className="text-sm font-medium text-purple-900">Badges</span>
                          </div>
                          <p className="text-2xl font-bold text-purple-900">{badges?.earned_badges.length || 0}</p>
                          <p className="text-xs text-purple-700 mt-1">Earned</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🚀</div>
                      <p className="text-gray-500 mb-6 text-lg">Ready to start your journey?</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Achievements Section */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-6 w-6 text-yellow-600" />
                    <span>Recent Achievements</span>
                  </CardTitle>
                  <CardDescription>Your latest badges and milestones</CardDescription>
                </CardHeader>
                <CardContent>
                  {dataLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Loading achievements...</p>
                    </div>
                  ) : badges && badges.earned_badges.length > 0 ? (
                    <div className="space-y-3">
                      {badges.earned_badges.slice(0, 4).map((badge) => (
                        <div
                          key={badge.id}
                          className="flex items-center space-x-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 hover:bg-yellow-100 transition-colors"
                        >
                          <Award className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-yellow-800 truncate block">{badge.definition.name}</span>
                            <span className="text-xs text-yellow-600 line-clamp-1">{badge.definition.description}</span>
                          </div>
                        </div>
                      ))}
                      {badges.earned_badges.length > 4 && (
                        <div className="text-center py-2">
                          <span className="text-xs text-gray-500">+{badges.earned_badges.length - 4} more</span>
                        </div>
                      )}
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => router.push('/profile')}
                      >
                        View All Badges
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No achievements yet</p>
                      <p className="text-xs text-gray-400 mt-1">Complete lessons to earn badges!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Row - Lessons and Account Info */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Lessons Section */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="h-6 w-6 text-primary" />
                    <span>Start Learning</span>
                  </CardTitle>
                  <CardDescription>Begin your language learning journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
          <Card 
                      className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => router.push('/sessions')}
          >
            <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                          <MessageCircle className="h-8 w-8 text-primary" />
              </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Interactive Lesson</h3>
                        <p className="text-gray-600 mb-4">Practice pronunciation with AI feedback</p>
                        {progress && progress.overall_stats.total_sessions > 0 && (
                          <Button className="w-full">
                            Continue Learning
                          </Button>
                        )}
                        {(!progress || progress.overall_stats.total_sessions === 0) && (
                          <Button className="w-full">
                            Begin First Lesson
                          </Button>
                        )}
            </CardContent>
          </Card>

          <Card 
                      className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 hover:border-accent/40 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => router.push('/profile')}
          >
            <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4 relative group-hover:bg-accent/30 transition-colors">
                          <User className="h-8 w-8 text-primary" />
                {badges && badges.earned_badges.length > 0 && (
                            <div className="absolute -top-2 -right-2 bg-primary text-white text-sm rounded-full h-6 w-6 flex items-center justify-center">
                    {badges.earned_badges.length}
                  </div>
                )}
              </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Profile</h3>
                        <p className="text-gray-600 mb-4">
                {badges && badges.earned_badges.length > 0 
                  ? `${badges.earned_badges.length} badges earned`
                            : 'View detailed progress & statistics'
                }
              </p>
                        <Button variant="outline" className="w-full">
                          View Profile
                        </Button>
            </CardContent>
          </Card>
              </div>
            </CardContent>
          </Card>
        </div>

                        {/* Account Information */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                    <User className="h-6 w-6 text-primary" />
                    <span>Account</span>
              </CardTitle>
                  <CardDescription>Your profile and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                  <div className="space-y-3">
                {(user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name) && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Display Name</p>
                    <p className="text-sm text-gray-900 truncate">
                      {user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900 truncate">{user.email}</p>
                </div>
                <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.email_confirmed_at 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.email_confirmed_at ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div>
                      <p className="text-sm font-medium text-gray-500">Last Active</p>
                  <p className="text-sm text-gray-900">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
                      </div>
                    </div>
        </div>
      </main>
    </div>
  );
}
