'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BadgeDisplay } from '@/components/badges/BadgeDisplay';
import { ProgressStats } from '@/components/profile/ProgressStats';
import { 
  ArrowLeft, 
  User, 
  Award, 
  BarChart3, 
  Calendar,
  Settings,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import type { BadgeResponse } from '@/app/api/badges/route';
import type { ProgressResponse } from '@/app/api/progress/route';

type ProfileSection = 'overview' | 'badges' | 'statistics' | 'activity' | 'settings';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // State management
  const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
  const [badges, setBadges] = useState<BadgeResponse | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch user data
  const fetchUserData = async (showRefreshIndicator = false) => {
    if (!user) return;
    
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [badgesRes, progressRes] = await Promise.all([
        fetch('/api/badges'),
        fetch('/api/progress')
      ]);

      if (!badgesRes.ok) {
        throw new Error(`Failed to fetch badges: ${badgesRes.status}`);
      }
      if (!progressRes.ok) {
        throw new Error(`Failed to fetch progress: ${progressRes.status}`);
      }

      const [badgesData, progressData] = await Promise.all([
        badgesRes.json(),
        progressRes.json()
      ]);

      setBadges(badgesData);
      setProgress(progressData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Navigation items
  const navigationItems = [
    { id: 'overview' as ProfileSection, label: 'Overview', icon: User },
    { id: 'badges' as ProfileSection, label: 'Badges', icon: Award },
    { id: 'statistics' as ProfileSection, label: 'Statistics', icon: BarChart3 },
    { id: 'activity' as ProfileSection, label: 'Recent Activity', icon: Calendar },
    { id: 'settings' as ProfileSection, label: 'Settings', icon: Settings },
  ];

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Error state
  if (error && !badges && !progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Profile</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => fetchUserData()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-xl font-semibold text-gray-900">Your Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUserData(true)}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                          activeSection === item.id
                            ? 'bg-primary/10 text-primary border-r-2 border-primary'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeSection === 'overview' && (
              <ProfileOverview user={user} badges={badges} progress={progress} />
            )}
            {activeSection === 'badges' && (
              <ProfileBadges badges={badges} />
            )}
            {activeSection === 'statistics' && (
              <ProfileStatistics progress={progress} />
            )}
            {activeSection === 'activity' && (
              <ProfileActivity progress={progress} />
            )}
            {activeSection === 'settings' && (
              <ProfileSettings user={user} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Overview Section
function ProfileOverview({ 
  user, 
  badges, 
  progress 
}: { 
  user: any; 
  badges: BadgeResponse | null; 
  progress: ProgressResponse | null; 
}) {
  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <span>Account Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-lg text-gray-900">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Member Since</p>
                <p className="text-lg text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Email Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  user.email_confirmed_at 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.email_confirmed_at ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Last Active</p>
                <p className="text-lg text-gray-900">
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {progress && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {badges?.earned_badges.length || 0}
              </div>
              <p className="text-gray-600">Badges Earned</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {progress.overall_stats.total_sessions}
              </div>
              <p className="text-gray-600">Total Lessons</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {progress.overall_stats.current_streak}
              </div>
              <p className="text-gray-600">Day Streak</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Badges */}
      {badges && badges.earned_badges.length > 0 && (
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <BadgeDisplay 
              badges={badges.earned_badges.slice(0, 6)} 
              layout="grid"
              showFilters={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Profile Badges Section
function ProfileBadges({ badges }: { badges: BadgeResponse | null }) {
  if (!badges) {
    return (
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading badges...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Award className="h-5 w-5 text-primary" />
          <span>Your Badges</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BadgeDisplay 
          badges={badges.earned_badges}
          availableBadges={badges.available_badges}
          layout="grid"
          showProgress={true}
          showFilters={true}
        />
      </CardContent>
    </Card>
  );
}

// Profile Statistics Section
function ProfileStatistics({ progress }: { progress: ProgressResponse | null }) {
  if (!progress) {
    return (
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Learning Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressStats progress={progress} />
        </CardContent>
      </Card>
    </div>
  );
}

// Profile Activity Section
function ProfileActivity({ progress }: { progress: ProgressResponse | null }) {
  if (!progress) {
    return (
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity...</p>
        </CardContent>
      </Card>
    );
  }

  const language_map = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German"
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Activity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">This Week</h4>
                <p className="text-2xl font-bold text-blue-700">
                  {progress.recent_activity.sessions_this_week}
                </p>
                <p className="text-sm text-blue-600">Lessons completed</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">This Month</h4>
                <p className="text-2xl font-bold text-green-700">
                  {progress.recent_activity.sessions_this_month}
                </p>
                <p className="text-sm text-green-600">Lessons completed</p>
              </div>
            </div>

            {/* Language Breakdown */}
            {Object.keys(progress.language_stats.sessions_by_language).length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Languages Practiced</h4>
                <div className="space-y-2">
                  {Object.entries(progress.language_stats.sessions_by_language).map(([language, count]) => (
                    <div key={language} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium capitalize">{language_map[language as keyof typeof language_map]}</span>
                      <span className="text-sm text-gray-600">{count} lessons</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Lesson */}
            <div>
              <h4 className="font-semibold mb-3">Last Lesson</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  {progress.recent_activity.last_session_date
                    ? `Completed on ${new Date(progress.recent_activity.last_session_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}`
                    : 'No lessons completed yet'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Profile Settings Section
function ProfileSettings({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary" />
            <span>Account Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-3">Profile Information</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {user.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Contact support to change your email address
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3">Learning Preferences</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Daily Reminders</p>
                    <p className="text-sm text-gray-600">Get notified to practice daily</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Progress Sharing</p>
                    <p className="text-sm text-gray-600">Share achievements with friends</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3 text-red-700">Danger Zone</h4>
              <div className="border border-red-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-3">
                  These actions cannot be undone. Please proceed with caution.
                </p>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}