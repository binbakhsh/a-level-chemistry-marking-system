import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  ArrowLeftIcon,
  DocumentArrowUpIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ClockIcon
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
  totalMarks: number;
  examBoard: {
    name: string;
    code: string;
  };
}

interface ProcessingStatus {
  status: 'uploading' | 'ocr_processing' | 'ai_processing' | 'completed' | 'failed';
  message: string;
  progress?: number;
  ocrText?: string;
  parsedData?: any;
  error?: string;
}

export default function UploadMarkschemeForPaperPage() {
  const { paperId } = useParams<{ paperId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [isLoadingPaper, setIsLoadingPaper] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showOcrText, setShowOcrText] = useState(false);
  const [showParsedData, setShowParsedData] = useState(false);

  // Check for success message from paper creation
  useEffect(() => {
    const state = location.state as any;
    if (state?.message && state?.type === 'success') {
      setSuccessMessage(state.message);
      if (state.paperData) {
        setPaper(state.paperData);
        setIsLoadingPaper(false);
      }
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location]);

  // Fetch paper details if not provided from navigation state
  useEffect(() => {
    if (!paper && paperId) {
      const fetchPaper = async () => {
        try {
          const response = await apiClient.get<Paper>(`/admin/papers/${paperId}`);
          if (response.success && response.data) {
            setPaper(response.data);
          }
        } catch (err) {
          setError('Failed to load paper details');
        } finally {
          setIsLoadingPaper(false);
        }
      };

      fetchPaper();
    }
  }, [paperId, paper]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length || !paperId) return;

    const file = acceptedFiles[0];
    setError('');
    setProcessingStatus({
      status: 'uploading',
      message: 'Uploading markscheme PDF...',
      progress: 0
    });

    try {
      const formData = new FormData();
      formData.append('markscheme', file);
      formData.append('version', '1.0');

      // Upload with progress tracking
      const response = await apiClient.upload(
        `/admin/papers/${paperId}/markscheme`,
        formData,
        (progress) => {
          setUploadProgress(progress);
          setProcessingStatus(prev => prev ? {
            ...prev,
            progress: Math.round(progress)
          } : null);
        }
      );

      if (response.success) {
        // Start monitoring the processing status
        monitorProcessingStatus(response.data.markscheme.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProcessingStatus({
        status: 'failed',
        message: 'Upload failed',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  const monitorProcessingStatus = async (markschemeId: string) => {
    setProcessingStatus({
      status: 'ocr_processing',
      message: 'Processing PDF with OCR... Extracting text and formulas.',
      progress: 25
    });

    // Simulate realistic processing time
    setTimeout(() => {
      setProcessingStatus({
        status: 'ai_processing',
        message: 'AI is analyzing the markscheme... Identifying questions and marking points.',
        progress: 75
      });
    }, 3000);

    // Poll for completion (in real implementation, you'd poll the backend)
    setTimeout(async () => {
      try {
        // Fetch the processed markscheme
        const response = await apiClient.get(`/admin/papers/${paperId}/markscheme`);
        if (response.success && response.data) {
          const markscheme = response.data;
          setProcessingStatus({
            status: 'completed',
            message: `✅ Processing complete! Found ${markscheme.questionCount} questions with ${markscheme.totalMarks} total marks.`,
            progress: 100,
            ocrText: markscheme.content.ocrText || 'OCR text not available',
            parsedData: markscheme.content
          });
        }
      } catch (err) {
        setProcessingStatus({
          status: 'failed',
          message: 'Processing failed',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }, 8000);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  if (isLoadingPaper) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Paper Not Found</h2>
        <Link to="/admin" className="btn-primary">Back to Admin Dashboard</Link>
      </div>
    );
  }

  const getStatusIcon = (status: ProcessingStatus['status']) => {
    switch (status) {
      case 'uploading':
      case 'ocr_processing':
      case 'ai_processing':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/admin" className="btn-secondary">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Admin
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Markscheme</h1>
          <p className="text-gray-600">Upload markscheme for {paper.code}</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Paper Details */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Paper Information</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Paper Code</p>
              <p className="text-lg font-semibold text-gray-900">{paper.code}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Exam Board</p>
              <p className="text-lg font-semibold text-gray-900">{paper.examBoard.code}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Session</p>
              <p className="text-lg font-semibold text-gray-900">{paper.session} {paper.year}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Subject</p>
              <p className="text-lg font-semibold text-gray-900">{paper.subject}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Title</p>
            <p className="text-gray-900">{paper.title}</p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {!processingStatus && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Upload Markscheme PDF</h2>
          </div>
          <div className="card-body">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive ? 'Drop markscheme PDF here' : 'Upload Markscheme PDF'}
              </p>
              <p className="text-gray-600 mb-4">
                Drag and drop a PDF file, or click to browse
              </p>
              <div className="text-sm text-gray-500">
                Maximum file size: 50MB • PDF format only
              </div>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Status */}
      {processingStatus && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              {getStatusIcon(processingStatus.status)}
              <h2 className="text-lg font-semibold text-gray-900">Processing Status</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <p className="text-gray-900 mb-2">{processingStatus.message}</p>
                {processingStatus.progress && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingStatus.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {processingStatus.status === 'completed' && (
                <div className="space-y-4">
                  {/* OCR Text Preview */}
                  <div>
                    <button
                      onClick={() => setShowOcrText(!showOcrText)}
                      className="btn-secondary mb-2"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      {showOcrText ? 'Hide' : 'Show'} OCR Extracted Text
                    </button>
                    {showOcrText && processingStatus.ocrText && (
                      <div className="bg-gray-50 p-4 rounded-md max-h-64 overflow-y-auto">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                          {processingStatus.ocrText.substring(0, 2000)}
                          {processingStatus.ocrText.length > 2000 && '... (truncated)'}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Parsed Data Preview */}
                  <div>
                    <button
                      onClick={() => setShowParsedData(!showParsedData)}
                      className="btn-secondary mb-2"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      {showParsedData ? 'Hide' : 'Show'} AI Parsed Questions
                    </button>
                    {showParsedData && processingStatus.parsedData?.questions && (
                      <div className="bg-gray-50 p-4 rounded-md max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {processingStatus.parsedData.questions.slice(0, 5).map((q: any, index: number) => (
                            <div key={index} className="border-b border-gray-200 pb-2">
                              <p className="font-medium text-gray-900">
                                Question {q.id}: {q.maxMarks} marks
                              </p>
                              <p className="text-sm text-gray-600">
                                {q.text?.substring(0, 100)}...
                              </p>
                            </div>
                          ))}
                          {processingStatus.parsedData.questions.length > 5 && (
                            <p className="text-sm text-gray-500">
                              ... and {processingStatus.parsedData.questions.length - 5} more questions
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-4">
                    <Link to="/admin" className="btn-primary">
                      ✅ Complete - Back to Admin Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setProcessingStatus(null);
                        setUploadProgress(0);
                      }}
                      className="btn-secondary"
                    >
                      Upload Another Markscheme
                    </button>
                  </div>
                </div>
              )}

              {processingStatus.status === 'failed' && processingStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800 font-medium">Error Details:</p>
                  <p className="text-red-700 text-sm mt-1">{processingStatus.error}</p>
                  <button
                    onClick={() => {
                      setProcessingStatus(null);
                      setError('');
                    }}
                    className="btn-secondary mt-3"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}