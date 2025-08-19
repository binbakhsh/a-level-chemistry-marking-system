import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  AcademicCapIcon,
  UsersIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AdminStats {
  overview: {
    totalPapers: number;
    totalMarkschemes: number;
    totalSubmissions: number;
    markschemeComplete: string;
  };
  recentSubmissions: Array<{
    id: string;
    createdAt: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    paper: {
      code: string;
      title: string;
    };
  }>;
  papersByExamBoard: Array<{
    examBoard: string;
    count: number;
  }>;
}

export default function AdminDashboardPage() {
  const location = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Check for success message from navigation state
    const state = location.state as any;
    if (state?.message && state?.type === 'success') {
      setSuccessMessage(state.message);
      // Clear the message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      // Clear the state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }

    const fetchStats = async () => {
      try {
        const response = await apiClient.get<AdminStats>('/admin/stats');
        if (response.data) {
          setStats(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">{error || 'Failed to load stats'}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage papers, markschemes, and system overview</p>
        </div>
        <div className="flex space-x-4">
          <Link to="/admin/papers/new" className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Paper
          </Link>
          <Link to="/admin/papers" className="btn-secondary">
            <EyeIcon className="h-4 w-4 mr-2" />
            View All Papers
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-10 w-10 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Papers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.overview.totalPapers}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AcademicCapIcon className="h-10 w-10 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Markschemes</p>
              <p className="text-3xl font-bold text-gray-900">{stats.overview.totalMarkschemes}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-10 w-10 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Submissions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.overview.totalSubmissions}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-10 w-10 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">{stats.overview.markschemeComplete}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {stats.recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {submission.user.firstName} {submission.user.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{submission.paper.code}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/results/${submission.id}`}
                    className="btn-secondary btn-sm"
                  >
                    View
                  </Link>
                </div>
              ))}
              {stats.recentSubmissions.length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent submissions</p>
              )}
            </div>
          </div>
        </div>

        {/* Papers by Exam Board */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Papers by Exam Board</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {stats.papersByExamBoard.map((board, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{board.examBoard}</span>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                    {board.count} papers
                  </span>
                </div>
              ))}
              {stats.papersByExamBoard.length === 0 && (
                <p className="text-gray-500 text-center py-4">No papers available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/papers/new"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <PlusIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Create New Paper</p>
                <p className="text-sm text-gray-500">Add a new exam paper to the system</p>
              </div>
            </Link>

            <Link
              to="/admin/papers"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <DocumentTextIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Manage Papers</p>
                <p className="text-sm text-gray-500">View and edit existing papers</p>
              </div>
            </Link>

            <Link
              to="/admin/markschemes"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <AcademicCapIcon className="h-8 w-8 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Upload Markschemes</p>
                <p className="text-sm text-gray-500">Add markschemes to papers</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}