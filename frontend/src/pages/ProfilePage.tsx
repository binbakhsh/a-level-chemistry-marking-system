import { useState, useEffect } from 'react';
import { 
  UserIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  TrophyIcon 
} from '@heroicons/react/24/outline';
import useAuthStore from '@/stores/auth';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    submissions: number;
  };
}

interface UserStats {
  totalSubmissions: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  recentSubmissions: number;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [profileResponse, statsResponse] = await Promise.all([
          apiClient.get<UserProfile>('/users/profile'),
          apiClient.get<UserStats>('/users/stats'),
        ]);

        if (profileResponse.data) {
          setProfile(profileResponse.data);
        }
        
        if (statsResponse.data) {
          setStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getGradeFromPercentage = (percentage: number) => {
    if (percentage >= 80) return 'A*';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    if (percentage >= 30) return 'E';
    return 'U';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-600">
          Manage your account and view your performance statistics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-primary-100 rounded-full">
                <UserIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {profile?.firstName} {profile?.lastName}
                </h2>
                <p className="text-gray-600">{profile?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Account Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="text-gray-900 font-mono text-xs">{profile?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="text-gray-900 capitalize">{profile?.role.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      profile?.isVerified 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-warning-100 text-warning-800'
                    }`}>
                      {profile?.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member since:</span>
                    <span className="text-gray-900">
                      {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Activity Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Submissions:</span>
                    <span className="text-gray-900 font-semibold">
                      {profile?._count.submissions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-gray-900">
                      {profile?.updatedAt ? formatDate(profile.updatedAt) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Statistics */}
          {stats && stats.totalSubmissions > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Statistics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-primary-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    {stats.averageScore.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Grade: {getGradeFromPercentage(stats.averageScore)}
                  </p>
                </div>

                <div className="text-center p-4 bg-success-50 rounded-lg">
                  <div className="text-2xl font-bold text-success-600 mb-1">
                    {stats.bestScore.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">Best Score</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Grade: {getGradeFromPercentage(stats.bestScore)}
                  </p>
                </div>

                <div className="text-center p-4 bg-warning-50 rounded-lg">
                  <div className="text-2xl font-bold text-warning-600 mb-1">
                    {stats.worstScore.toFixed(1)}%
                  </div>
                  <p className="text-sm text-gray-600">Lowest Score</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Grade: {getGradeFromPercentage(stats.worstScore)}
                  </p>
                </div>

                <div className="text-center p-4 bg-secondary-50 rounded-lg">
                  <div className="text-2xl font-bold text-secondary-600 mb-1">
                    {stats.recentSubmissions}
                  </div>
                  <p className="text-sm text-gray-600">Recent (30d)</p>
                  <p className="text-xs text-gray-500 mt-1">Submissions</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Performance Insights</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {stats.averageScore >= 80 && (
                    <p className="flex items-center space-x-2">
                      <TrophyIcon className="h-4 w-4 text-yellow-500" />
                      <span>Excellent performance! You're consistently achieving A* grades.</span>
                    </p>
                  )}
                  {stats.averageScore >= 60 && stats.averageScore < 80 && (
                    <p className="flex items-center space-x-2">
                      <ChartBarIcon className="h-4 w-4 text-blue-500" />
                      <span>Good progress! You're on track for strong A-Level results.</span>
                    </p>
                  )}
                  {stats.averageScore < 60 && (
                    <p className="flex items-center space-x-2">
                      <DocumentTextIcon className="h-4 w-4 text-orange-500" />
                      <span>Keep practicing! Consider reviewing fundamental concepts.</span>
                    </p>
                  )}
                  {stats.bestScore - stats.worstScore > 30 && (
                    <p className="text-gray-600">
                      Your scores show good improvement over time. Consistency is key!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full btn-primary text-sm py-2">
                Change Password
              </button>
              <button className="w-full btn-secondary text-sm py-2">
                Update Profile
              </button>
              <button className="w-full btn-secondary text-sm py-2">
                Download Data
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Notifications</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Marketing Emails</span>
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">SMS Notifications</span>
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {stats && stats.totalSubmissions === 0 && (
            <div className="card p-6 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Get Started</h3>
              <p className="text-sm text-gray-600 mb-4">
                Submit your first chemistry paper to see detailed performance analytics.
              </p>
              <button className="btn-primary text-sm">
                Submit Paper
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}