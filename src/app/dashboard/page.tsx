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

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card 
            className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all cursor-pointer"
            onClick={() => router.push('/sessions')}
          >
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Sessions Demo</h3>
              <p className="text-sm text-gray-600">Test session management</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Schedule</h3>
              <p className="text-sm text-gray-600">Plan your lessons</p>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all cursor-pointer"
            onClick={() => router.push('/profile')}
          >
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3 relative">
                <Award className="h-6 w-6 text-primary" />
                {badges && badges.earned_badges.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {badges.earned_badges.length}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Profile</h3>
              <p className="text-sm text-gray-600">
                {badges && badges.earned_badges.length > 0 
                  ? `${badges.earned_badges.length} badges earned`
                  : 'View badges & progress'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Settings className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
              <p className="text-sm text-gray-600">Customize preferences</p>
            </CardContent>
          </Card>
        </div>

        {/* User Information Card */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Account Information</span>
              </CardTitle>
              <CardDescription>Your profile details and account status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">User ID</p>
                  <p className="text-sm text-gray-900 font-mono">{user.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email Verified</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.email_confirmed_at 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.email_confirmed_at ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Sign In</p>
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

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-primary" />
                <span>Learning Progress</span>
              </CardTitle>
              <CardDescription>Your language learning achievements and stats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Loading your progress...</p>
                </div>
              ) : progress && progress.overall_stats.total_sessions > 0 ? (
                <div className="space-y-4">
                  {/* Progress Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <Target className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm font-medium text-blue-900">Sessions</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900">{progress.overall_stats.completed_sessions}</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <Flame className="h-4 w-4 text-orange-600 mr-1" />
                        <span className="text-sm font-medium text-orange-900">Streak</span>
                      </div>
                      <p className="text-lg font-bold text-orange-900">{progress.overall_stats.current_streak} days</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm font-medium text-green-900">Accuracy</span>
                      </div>
                      <p className="text-lg font-bold text-green-900">{Math.round(progress.performance_metrics.completion_rate)}%</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <Trophy className="h-4 w-4 text-purple-600 mr-1" />
                        <span className="text-sm font-medium text-purple-900">Badges</span>
                      </div>
                      <p className="text-lg font-bold text-purple-900">{badges?.earned_badges.length || 0}</p>
                    </div>
                  </div>

                  {/* Recent Achievements */}
                  {badges && badges.earned_badges.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Achievements</h4>
                      <div className="flex flex-wrap gap-2">
                        {badges.earned_badges.slice(0, 3).map((badge) => (
                          <div
                            key={badge.id}
                            className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1"
                          >
                            <Award className="h-3 w-3 text-yellow-600" />
                            <span className="text-xs font-medium text-yellow-800">{badge.definition.name}</span>
                          </div>
                        ))}
                        {badges.earned_badges.length > 3 && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <span>+{badges.earned_badges.length - 3} more</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={() => router.push('/sessions')}
                  >
                    Continue Learning
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">🚀 Ready to start your journey?</p>
                  <Button 
                    className="w-full"
                    onClick={() => router.push('/sessions')}
                  >
                    Begin First Lesson
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
