import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  DocumentArrowUpIcon, 
  CloudArrowUpIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/services/api';
import { Paper, Submission } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SubmissionPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [uploadedSubmission, setUploadedSubmission] = useState<Submission | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAvailablePapers = async () => {
      try {
        console.log('Starting to fetch available papers...');
        const response = await apiClient.get<any>('/papers/available-for-submission');
        console.log('API Response:', response);
        
        if (response.success && response.data && response.data.length > 0) {
          const availablePapers = response.data;
          setPapers(availablePapers);
          setSelectedPaper(availablePapers[0].id);
          console.log(`✅ Loaded ${availablePapers.length} papers with processed mark schemes:`, availablePapers);
        } else {
          console.log('❌ No papers with processed mark schemes found. Response:', response);
          setError('No papers are currently available for submission. Please contact your instructor to upload mark schemes.');
        }
      } catch (error) {
        console.error('❌ Failed to fetch available papers:', error);
        setError(`Failed to load available papers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    fetchAvailablePapers();
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    if (!selectedPaper) {
      setError('Please select a paper first');
      return;
    }

    const file = acceptedFiles[0];
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('uploading');
      setError('');
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('paperId', selectedPaper);

      const response = await apiClient.upload<Submission>(
        '/submissions',
        formData,
        (progress) => setUploadProgress(progress)
      );

      if (response.data) {
        setUploadedSubmission(response.data);
        setUploadStatus('success');
        
        // Start polling for completion
        pollSubmissionStatus(response.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const pollSubmissionStatus = async (submissionId: string) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await apiClient.get<Submission>(`/submissions/${submissionId}`);
        
        if (response.data) {
          setUploadedSubmission(response.data);
          
          if (response.data.status === 'MARKING_COMPLETE') {
            // Redirect to results page
            setTimeout(() => {
              navigate(`/results/${submissionId}`);
            }, 2000);
            return;
          }
          
          if (response.data.status === 'FAILED') {
            setError(response.data.errorMessage || 'Processing failed');
            setUploadStatus('error');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setError('Processing timeout. Please check your submission later.');
          setUploadStatus('error');
        }
      } catch (error) {
        console.error('Failed to poll submission status:', error);
        setError('Failed to check processing status');
        setUploadStatus('error');
      }
    };

    poll();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    disabled: isUploading,
  });

  const getStatusDisplay = () => {
    if (!uploadedSubmission) return null;

    const statusConfig = {
      UPLOADED: { icon: CloudArrowUpIcon, text: 'Uploaded', color: 'text-blue-600' },
      PROCESSING: { icon: LoadingSpinner, text: 'Processing...', color: 'text-yellow-600' },
      OCR_COMPLETE: { icon: LoadingSpinner, text: 'Extracting text...', color: 'text-yellow-600' },
      MARKING_COMPLETE: { icon: CheckCircleIcon, text: 'Complete!', color: 'text-green-600' },
      FAILED: { icon: ExclamationTriangleIcon, text: 'Failed', color: 'text-red-600' },
    };

    const config = statusConfig[uploadedSubmission.status];
    const Icon = config.icon;

    return (
      <div className="flex items-center space-x-2">
        {Icon === LoadingSpinner ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Icon className={`h-5 w-5 ${config.color}`} />
        )}
        <span className={config.color}>{config.text}</span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submit Chemistry Paper</h1>
        <p className="mt-2 text-gray-600">
          Upload your completed AQA A-Level Chemistry paper for automated marking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Paper Selection */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Your Paper</h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose the paper that matches your answer sheet. Only papers with processed mark schemes are available.
            </p>
            {papers.length > 0 ? (
              <div className="space-y-3">
                {papers.map((paper) => (
                  <label
                    key={paper.id}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedPaper === paper.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paper"
                      value={paper.id}
                      checked={selectedPaper === paper.id}
                      onChange={(e) => setSelectedPaper(e.target.value)}
                      className="mt-1 mr-3 text-primary-600"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {paper.displayName || `${paper.examBoard?.name} ${paper.code} - ${paper.session} ${paper.year}`}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{paper.title}</p>
                      <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                        <span>📝 {paper.totalMarks} marks</span>
                        <span>❓ {paper.markscheme?.questionCount || 'N/A'} questions</span>
                        <span className="text-green-600">✅ Mark scheme ready</span>
                      </div>
                      {paper.processedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Processed: {new Date(paper.processedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  📋
                </div>
                <p className="text-gray-600">{error}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <LoadingSpinner size="md" />
                <p className="mt-2 text-gray-600">Loading available papers...</p>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Answer Sheet</h2>
            
            {error && (
              <div className="mb-4 bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input {...getInputProps()} />
              
              {uploadStatus === 'uploading' ? (
                <div className="space-y-4">
                  <LoadingSpinner size="lg" className="mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">Uploading...</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{uploadProgress.toFixed(0)}%</p>
                  </div>
                </div>
              ) : uploadStatus === 'success' && uploadedSubmission ? (
                <div className="space-y-4">
                  <CheckCircleIcon className="h-16 w-16 text-success-500 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">Upload Successful!</p>
                    <p className="text-gray-600">{uploadedSubmission.fileName}</p>
                    <div className="mt-2">{getStatusDisplay()}</div>
                    {uploadedSubmission.status === 'MARKING_COMPLETE' && (
                      <p className="text-sm text-gray-600 mt-2">
                        Redirecting to results...
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <DocumentArrowUpIcon className="h-16 w-16 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? 'Drop your PDF here' : 'Upload your answer sheet'}
                    </p>
                    <p className="text-gray-600">
                      Drag and drop a PDF file, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Maximum file size: 50MB • PDF format only
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  1
                </div>
                <p><strong>Choose your paper</strong> from the available options (only papers with processed mark schemes are shown)</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  2
                </div>
                <p><strong>Upload your answer sheet</strong> as a clear, high-quality PDF</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <p><strong>Automated processing</strong> - OCR extracts your answers and AI marks them against the selected mark scheme</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  4
                </div>
                <p><strong>Review detailed results</strong> with question-by-question feedback and scores</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for Best Results</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <span className="text-primary-600">•</span>
                <span>Ensure your handwriting is clear and legible</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600">•</span>
                <span>Write chemical formulas clearly</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600">•</span>
                <span>Scan at high resolution (300 DPI minimum)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-primary-600">•</span>
                <span>Ensure all pages are included in order</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}