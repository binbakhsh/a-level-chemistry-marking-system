import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DocumentArrowUpIcon, 
  ChartBarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import useAuthStore from '@/stores/auth';
import { apiClient } from '@/services/api';
import { Submission } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    bestScore: 0,
    recentSubmissions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [submissionsResponse, statsResponse] = await Promise.all([
          apiClient.get<{ submissions: Submission[] }>('/submissions?limit=5'),
          apiClient.get('/users/stats'),
        ]);

        if (submissionsResponse.data) {
          setSubmissions(submissionsResponse.data.submissions);
        }
        
        if (statsResponse.data) {
          setStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'MARKING_COMPLETE':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'PROCESSING':
      case 'OCR_COMPLETE':
        return <ClockIcon className="h-5 w-5 text-warning-500" />;
      case 'FAILED':
        return <ExclamationTriangleIcon className="h-5 w-5 text-error-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'UPLOADED':
        return 'Uploaded';
      case 'PROCESSING':
        return 'Processing';
      case 'OCR_COMPLETE':
        return 'Extracted';
      case 'MARKING_COMPLETE':
        return 'Complete';
      case 'FAILED':
        return 'Failed';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Track your chemistry paper submissions and performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <DocumentArrowUpIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalSubmissions}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.averageScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Best Score</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.bestScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-secondary-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-secondary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent (30d)</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.recentSubmissions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/submit"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DocumentArrowUpIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">Submit New Paper</h3>
              <p className="text-sm text-gray-600">Upload and mark a new chemistry paper</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="h-8 w-8 text-secondary-600" />
            <div className="ml-4">
              <h3 className="font-medium text-gray-900">View Profile</h3>
              <p className="text-sm text-gray-600">Check your account and progress</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
        </div>
        <div className="card-body">
          {submissions.length === 0 ? (
            <div className="text-center py-8">
              <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
              <p className="text-gray-600 mb-4">Upload your first chemistry paper to get started</p>
              <Link to="/submit" className="btn-primary">
                Submit Paper
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(submission.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{submission.fileName}</h3>
                      <p className="text-sm text-gray-600">
                        {submission.paper.code} - {submission.paper.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {getStatusText(submission.status)}
                      </p>
                      {submission.percentage !== null && (
                        <p className="text-sm text-gray-600">
                          {submission.score}/{submission.maxScore} ({submission.percentage.toFixed(1)}%)
                        </p>
                      )}
                    </div>
                    {submission.status === 'MARKING_COMPLETE' && (
                      <Link
                        to={`/results/${submission.id}`}
                        className="btn-secondary btn text-sm"
                      >
                        View Results
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}