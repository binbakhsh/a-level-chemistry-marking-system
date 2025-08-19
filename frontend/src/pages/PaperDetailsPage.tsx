import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Paper {
  id: string;
  code: string;
  title: string;
  subject: string;
  level: string;
  year: number;
  session: string;
  duration?: number;
  totalMarks: number;
  totalQuestions?: number;
  totalSubparts?: number;
  examBoard: {
    id: string;
    name: string;
    code: string;
  };
  markscheme?: {
    id: string;
    version: string;
    questionCount: number;
    totalMarks: number;
    isActive: boolean;
    createdAt: string;
  };
  _count: {
    submissions: number;
  };
}

interface Markscheme {
  id: string;
  version: string;
  content: any;
  totalMarks: number;
  questionCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function PaperDetailsPage() {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [markscheme, setMarkscheme] = useState<Markscheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMarkscheme, setIsLoadingMarkscheme] = useState(false);
  const [error, setError] = useState('');
  const [showMarkschemeDetails, setShowMarkschemeDetails] = useState(false);

  useEffect(() => {
    const fetchPaper = async () => {
      if (!paperId) return;

      try {
        const response = await apiClient.get<Paper>(`/admin/papers/${paperId}`);
        if (response.success && response.data) {
          setPaper(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load paper details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaper();
  }, [paperId]);

  const fetchMarkschemeDetails = async () => {
    if (!paperId || !paper?.markscheme) return;

    setIsLoadingMarkscheme(true);
    try {
      const response = await apiClient.get<Markscheme>(`/admin/papers/${paperId}/markscheme`);
      if (response.success && response.data) {
        setMarkscheme(response.data);
        setShowMarkschemeDetails(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markscheme details');
    } finally {
      setIsLoadingMarkscheme(false);
    }
  };

  const handleDelete = async () => {
    if (!paper || !confirm(`Are you sure you want to delete paper "${paper.code}"?`)) return;
    
    try {
      await apiClient.delete(`/admin/papers/${paper.id}`);
      navigate('/admin/papers', { 
        state: { 
          message: `Paper ${paper.code} deleted successfully`,
          type: 'success' 
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete paper');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to="/admin/papers" className="btn-primary">Back to Papers</Link>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Paper Not Found</h2>
        <Link to="/admin/papers" className="btn-primary">Back to Papers</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin/papers" className="btn-secondary">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Papers
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{paper.code}</h1>
            <p className="text-gray-600">{paper.title}</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            className="btn-danger"
            disabled={paper._count.submissions > 0}
            title={paper._count.submissions > 0 ? "Cannot delete paper with submissions" : "Delete paper"}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paper Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Paper Information</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Exam Board</p>
                <p className="text-gray-900">{paper.examBoard.name} ({paper.examBoard.code})</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Subject</p>
                <p className="text-gray-900">{paper.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Level</p>
                <p className="text-gray-900">{paper.level}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Session</p>
                <p className="text-gray-900">{paper.session} {paper.year}</p>
              </div>
              {paper.duration && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p className="text-gray-900">{paper.duration} minutes</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Total Marks</p>
                <p className="text-gray-900">{paper.totalMarks} marks</p>
              </div>
              {paper.totalQuestions && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Questions</p>
                  <p className="text-gray-900">{paper.totalQuestions} questions</p>
                </div>
              )}
              {paper.totalSubparts && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Subparts</p>
                  <p className="text-gray-900">{paper.totalSubparts} subparts</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Markscheme Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Markscheme</h2>
          </div>
          <div className="card-body">
            {paper.markscheme ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-green-700 font-medium">Markscheme Available</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Version:</span>
                    <span className="text-sm font-medium">{paper.markscheme.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Questions:</span>
                    <span className="text-sm font-medium">{paper.markscheme.questionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Marks:</span>
                    <span className="text-sm font-medium">{paper.markscheme.totalMarks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Uploaded:</span>
                    <span className="text-sm font-medium">
                      {new Date(paper.markscheme.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={fetchMarkschemeDetails}
                    disabled={isLoadingMarkscheme}
                    className="btn-primary btn-sm"
                  >
                    {isLoadingMarkscheme ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <EyeIcon className="h-4 w-4 mr-1" />
                    )}
                    View Details
                  </button>
                  <Link
                    to={`/admin/papers/${paper.id}/upload-markscheme`}
                    className="btn-secondary btn-sm"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Update
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No markscheme uploaded</p>
                <Link
                  to={`/admin/papers/${paper.id}/upload-markscheme`}
                  className="btn-primary"
                >
                  Upload Markscheme
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Usage Statistics</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{paper._count.submissions}</p>
              <p className="text-sm text-gray-500">Total Submissions</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {paper.markscheme ? 'Active' : 'Inactive'}
              </p>
              <p className="text-sm text-gray-500">Status</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {paper.markscheme ? '100%' : '0%'}
              </p>
              <p className="text-sm text-gray-500">Setup Complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Markscheme Details Modal */}
      {showMarkschemeDetails && markscheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Markscheme Details</h3>
              <button
                onClick={() => setShowMarkschemeDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {markscheme.content.questions && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{markscheme.questionCount}</p>
                      <p className="text-sm text-gray-500">Questions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{markscheme.totalMarks}</p>
                      <p className="text-sm text-gray-500">Total Marks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{markscheme.version}</p>
                      <p className="text-sm text-gray-500">Version</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Questions</h4>
                    <div className="space-y-4">
                      {markscheme.content.questions.slice(0, 10).map((question: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-900">Question {question.id}</h5>
                            <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded">
                              {question.maxMarks} marks
                            </span>
                          </div>
                          {question.text && (
                            <p className="text-gray-700 text-sm mb-2">{question.text.substring(0, 200)}...</p>
                          )}
                          {question.markingPoints && question.markingPoints.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {question.markingPoints.length} marking point(s)
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {markscheme.content.questions.length > 10 && (
                        <div className="text-center py-4 text-gray-500">
                          ... and {markscheme.content.questions.length - 10} more questions
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}