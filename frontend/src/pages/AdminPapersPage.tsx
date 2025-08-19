import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  DocumentTextIcon,
  AcademicCapIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AdminPaper {
  id: string;
  code: string;
  title: string;
  subject: string;
  level: string;
  year: number;
  session: string;
  totalMarks: number;
  examBoard: {
    id: string;
    name: string;
    code: string;
  };
  markscheme?: {
    id: string;
    questionCount: number;
    totalMarks: number;
  };
  _count: {
    submissions: number;
  };
}

interface PaginatedResponse {
  papers: AdminPaper[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminPapersPage() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<AdminPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    examBoardId: '',
    year: '',
    subject: ''
  });

  const fetchPapers = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.examBoardId && { examBoardId: filters.examBoardId }),
        ...(filters.year && { year: filters.year }),
        ...(filters.subject && { subject: filters.subject })
      });

      const response = await apiClient.get<PaginatedResponse>(`/admin/papers?${queryParams}`);
      if (response.success && response.data) {
        setPapers(response.data.papers);
        setCurrentPage(response.data.pagination.page);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load papers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, [filters]);

  const handleDelete = async (paperId: string, paperCode: string) => {
    if (!window.confirm(`Are you sure you want to delete paper ${paperCode}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/papers/${paperId}`);
      fetchPapers(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete paper');
    }
  };

  if (isLoading && papers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin" className="btn-secondary">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Papers</h1>
            <p className="text-gray-600">View and manage all exam papers</p>
          </div>
        </div>
        <Link to="/admin/papers/new" className="btn-primary">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add New Paper
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            <h3 className="text-lg font-medium">Filters</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Filter by subject..."
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <input
                type="number"
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                placeholder="Filter by year..."
                className="input w-full"
                min="2020"
                max="2030"
              />
            </div>
            <div>
              <button
                onClick={() => setFilters({ examBoardId: '', year: '', subject: '' })}
                className="btn-secondary mt-6"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Papers Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            Papers ({papers.length} of {totalPages * 10})
          </h2>
        </div>
        <div className="card-body p-0">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paper Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Board
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Markscheme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {papers.map((paper) => (
                  <tr key={paper.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {paper.code} - {paper.session} {paper.year}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {paper.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {paper.subject} • {paper.level} • {paper.totalMarks} marks
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {paper.examBoard.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {paper.markscheme ? (
                        <div className="flex items-center text-green-600">
                          <AcademicCapIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">
                            {paper.markscheme.questionCount} questions
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">No markscheme</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {paper._count.submissions}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {!paper.markscheme && (
                          <button
                            onClick={() => navigate(`/admin/papers/${paper.id}/upload-markscheme`)}
                            className="btn-sm btn-primary"
                            title="Upload Markscheme"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/admin/papers/${paper.id}`)}
                          className="btn-sm btn-secondary"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(paper.id, paper.code)}
                          className="btn-sm btn-danger"
                          title="Delete Paper"
                          disabled={paper._count.submissions > 0}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {papers.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No papers found</h3>
              <p className="text-gray-600 mb-4">
                {Object.values(filters).some(f => f) 
                  ? 'No papers match your current filters.' 
                  : 'Get started by creating your first paper.'
                }
              </p>
              <Link to="/admin/papers/new" className="btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create New Paper
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchPapers(currentPage - 1)}
              disabled={currentPage <= 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => fetchPapers(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}