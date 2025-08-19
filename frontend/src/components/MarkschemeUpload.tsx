import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  DocumentArrowUpIcon, 
  CloudArrowUpIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface MarkschemeUploadProps {
  onSuccess?: (markschemeId: string) => void;
}

interface ProcessingStatus {
  stage: 'uploading' | 'ocr_processing' | 'ai_parsing' | 'complete' | 'error';
  message: string;
  progress: number;
}

interface NotificationState {
  show: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

const MarkschemeUpload: React.FC<MarkschemeUploadProps> = ({ onSuccess }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'uploading',
    message: 'Ready to upload',
    progress: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [uploadedMarkscheme, setUploadedMarkscheme] = useState<any>(null);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      const errorMsg = 'Only PDF files are allowed for mark schemes';
      setError(errorMsg);
      setNotification({
        show: true,
        type: 'error',
        title: 'Invalid File Type',
        message: errorMsg
      });
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      const errorMsg = 'File size must be less than 50MB';
      setError(errorMsg);
      setNotification({
        show: true,
        type: 'error',
        title: 'File Too Large',
        message: errorMsg
      });
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      setNotification({ ...notification, show: false }); // Clear any existing notifications
      setProcessingStatus({
        stage: 'uploading',
        message: 'Uploading mark scheme PDF...',
        progress: 0
      });

      const formData = new FormData();
      formData.append('markscheme', file);
      formData.append('paperId', 'default-paper'); // You can make this dynamic
      formData.append('examBoard', 'AQA');
      formData.append('subject', 'Chemistry');
      formData.append('level', 'A-Level');

      // Upload and start processing
      console.log('Starting upload request...');
      const response = await apiClient.upload<any>(
        '/markschemes/upload-pdf',
        formData,
        (progress) => {
          setUploadProgress(progress);
          setProcessingStatus({
            stage: 'uploading',
            message: `Uploading... ${progress.toFixed(0)}%`,
            progress: progress * 0.2 // Upload is 20% of total process
          });
        }
      );

      console.log('Upload response received:', response);

      if (response && response.success && response.data) {
        setUploadedMarkscheme(response.data);
        
        // Show upload success notification
        console.log('Setting upload success notification');
        const newNotification = {
          show: true,
          type: 'success' as const,
          title: 'Upload Successful!',
          message: 'Your mark scheme has been uploaded and processing has started.'
        };
        setNotification(newNotification);
        console.log('Upload notification set:', newNotification);
        
        // Start polling for processing status
        pollProcessingStatus(response.data.id);
      } else {
        console.error('No response data received');
        throw new Error('Upload failed - no response data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setProcessingStatus({
        stage: 'error',
        message: 'Upload failed',
        progress: 0
      });
      
      // Show error notification
      setNotification({
        show: true,
        type: 'error',
        title: 'Upload Failed',
        message: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pollProcessingStatus = async (markschemeId: string) => {
    const maxAttempts = 60; // 10 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await apiClient.get<any>(`/markschemes/${markschemeId}/status`);
        
        if (response.success && response.data) {
          const { status, stage, message, progress } = response.data;
          
          console.log('Polling status:', { status, stage, message, progress });
          
          if (status === 'COMPLETE') {
            setProcessingStatus({
              stage: 'complete',
              message: 'Mark scheme processed successfully!',
              progress: 100
            });
            setIsProcessing(false);
            
            // Show completion success notification
            setNotification({
              show: true,
              type: 'success',
              title: 'Processing Complete!',
              message: 'Your mark scheme has been successfully processed and is ready for use.'
            });
            
            if (onSuccess) {
              onSuccess(markschemeId);
            }
            return;
          }
          
          setProcessingStatus({
            stage: stage || 'ocr_processing',
            message: message || 'Processing...',
            progress: progress || 20
          });
          
          if (status === 'FAILED') {
            setError(response.data.errorMessage || 'Processing failed');
            setProcessingStatus({
              stage: 'error',
              message: 'Processing failed',
              progress: 0
            });
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setError('Processing timeout. The mark scheme may still be processing.');
          setProcessingStatus({
            stage: 'error',
            message: 'Processing timeout',
            progress: 0
          });
        }
      } catch (error) {
        console.error('Failed to poll processing status:', error);
        setError('Failed to check processing status');
        setProcessingStatus({
          stage: 'error',
          message: 'Status check failed',
          progress: 0
        });
      }
    };

    poll();
  };

  const dismissNotification = () => {
    setNotification({ ...notification, show: false });
  };


  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        dismissNotification();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification.show]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    disabled: isProcessing,
  });

  const getStageDisplay = () => {
    const stageConfig = {
      uploading: { icon: CloudArrowUpIcon, text: 'Uploading PDF...', color: 'text-blue-600' },
      ocr_processing: { icon: LoadingSpinner, text: 'OCR Processing...', color: 'text-yellow-600' },
      ai_parsing: { icon: LoadingSpinner, text: 'AI Parsing Mark Scheme...', color: 'text-purple-600' },
      complete: { icon: CheckCircleIcon, text: 'Complete!', color: 'text-green-600' },
      error: { icon: ExclamationTriangleIcon, text: 'Error', color: 'text-red-600' },
    };

    const config = stageConfig[processingStatus.stage];
    const Icon = config.icon;

    return (
      <div className="flex items-center space-x-2">
        {Icon === LoadingSpinner ? (
          <LoadingSpinner size="sm" />
        ) : (
          <Icon className={`h-5 w-5 ${config.color}`} />
        )}
        <span className={config.color}>{processingStatus.message}</span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Notification */}
      {console.log('Notification state:', notification) /* Debug log */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${
          notification.type === 'success' ? 'bg-green-50 border-green-200' :
          notification.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        } border rounded-lg shadow-lg`}>
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' && (
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                )}
                {notification.type === 'error' && (
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                )}
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-800' :
                  notification.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {notification.title}
                </p>
                <p className={`mt-1 text-sm ${
                  notification.type === 'success' ? 'text-green-700' :
                  notification.type === 'error' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className={`rounded-md inline-flex ${
                    notification.type === 'success' ? 'text-green-400 hover:text-green-500 focus:ring-green-500' :
                    notification.type === 'error' ? 'text-red-400 hover:text-red-500 focus:ring-red-500' :
                    'text-blue-400 hover:text-blue-500 focus:ring-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  onClick={dismissNotification}
                >
                  <span className="sr-only">Close</span>
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Mark Scheme</h1>
        <p className="mt-2 text-gray-600">
          Upload an AQA A-Level Chemistry mark scheme PDF for automated processing and extraction
        </p>
      </div>

      <div className="card p-6">
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
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />
          
          {isProcessing || processingStatus.stage === 'complete' ? (
            <div className="space-y-4">
              {processingStatus.stage === 'complete' ? (
                <CheckCircleIcon className="h-16 w-16 text-success-500 mx-auto" />
              ) : (
                <LoadingSpinner size="lg" className="mx-auto" />
              )}
              
              <div>
                <div className="mb-2">{getStageDisplay()}</div>
                
                {processingStatus.progress > 0 && processingStatus.stage !== 'complete' && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${processingStatus.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <DocumentArrowUpIcon className="h-16 w-16 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop your mark scheme PDF here' : 'Upload Mark Scheme PDF'}
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

        {processingStatus.stage === 'complete' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-semibold text-green-800">Processing Complete!</h3>
            <p className="text-green-700 mt-1">
              Your mark scheme has been successfully processed and is ready for use. 
              Students can now submit answer sheets that will be marked against this mark scheme.
            </p>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
              1
            </div>
            <p><strong>OCR Processing:</strong> We extract text, formulas, and structure from your PDF</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold">
              2
            </div>
            <p><strong>AI Analysis:</strong> Our AI identifies questions, marking points, and acceptable answers</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
              3
            </div>
            <p><strong>Ready to Use:</strong> Students can submit answer sheets for automated marking</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkschemeUpload;