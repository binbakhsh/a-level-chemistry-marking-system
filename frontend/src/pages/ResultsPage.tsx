import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChartBarIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/services/api';
import { SubmissionFeedback } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      if (!id) return;

      try {
        const response = await apiClient.get<SubmissionFeedback>(`/marking/submissions/${id}/results`);
        if (response.data) {
          setFeedback(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A*':
      case 'A':
        return 'text-green-600 bg-green-100';
      case 'B':
      case 'C':
        return 'text-yellow-600 bg-yellow-100';
      case 'D':
      case 'E':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-red-600 bg-red-100';
    }
  };

  const getQuestionIcon = (isCorrect: boolean, confidence?: number) => {
    if (isCorrect) {
      return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
    } else if (confidence && confidence > 0.5) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />;
    } else {
      return <XCircleIcon className="h-5 w-5 text-error-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Results</h2>
        <p className="text-gray-600 mb-4">{error || 'Results not found'}</p>
        <Link to="/dashboard" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/dashboard" className="btn-secondary">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marking Results</h1>
          <p className="text-gray-600">{feedback.submission.fileName}</p>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <TrophyIcon className="h-12 w-12 text-yellow-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {feedback.scores?.totalScore ?? 0}/{feedback.scores?.maxScore ?? 23}
          </h3>
          <p className="text-gray-600">Total Score</p>
        </div>

        <div className="card p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <ChartBarIcon className="h-12 w-12 text-primary-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {feedback.scores?.percentage ? feedback.scores.percentage.toFixed(1) : '0.0'}%
          </h3>
          <p className="text-gray-600">Percentage</p>
        </div>

        <div className="card p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className={`px-4 py-2 rounded-full font-bold text-xl ${getGradeColor(feedback.scores?.grade || 'Pending')}`}>
              {feedback.scores?.grade || 'Processing...'}
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Grade</h3>
          <p className="text-gray-600">Estimated</p>
        </div>
      </div>

      {/* Paper Information */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Paper Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Paper Code</p>
            <p className="text-gray-600">{feedback.paper.code}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Exam Board</p>
            <p className="text-gray-600">{feedback.paper.examBoard}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Session</p>
            <p className="text-gray-600">{feedback.paper.session} {feedback.paper.year}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Processing Time</p>
            <p className="text-gray-600">
              {feedback.submission.processingTime ? 
                `${(feedback.submission.processingTime / 1000).toFixed(1)}s` : 
                'N/A'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-success-600 mb-1">
              {feedback.summary.correctAnswers}
            </div>
            <p className="text-sm text-gray-600">Correct Answers</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {feedback.summary.totalQuestions}
            </div>
            <p className="text-sm text-gray-600">Total Questions</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {feedback.summary.accuracyRate.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Accuracy Rate</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Strengths</h3>
            <ul className="space-y-1">
              {feedback.summary.strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <CheckCircleIcon className="h-4 w-4 text-success-500 mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Areas for Improvement</h3>
            <ul className="space-y-1">
              {feedback.summary.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <ExclamationTriangleIcon className="h-4 w-4 text-warning-500 mt-0.5 flex-shrink-0" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Question-by-Question Results */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Question-by-Question Breakdown</h2>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            {feedback.questionResults.map((result) => (
              <div key={result.questionId} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getQuestionIcon(result.isCorrect, result.confidence)}
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Question {result.questionId}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {result.marksAwarded}/{result.maxMarks} marks
                        {result.confidence && (
                          <span className="ml-2">
                            (Confidence: {(result.confidence * 100).toFixed(0)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      result.isCorrect 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-error-100 text-error-800'
                    }`}>
                      {result.isCorrect ? 'Correct' : 'Incorrect'}
                    </div>
                  </div>
                </div>

                {result.studentAnswer && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Your Answer:</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-800">{result.studentAnswer}</p>
                    </div>
                  </div>
                )}

                {result.feedback && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback:</h4>
                    <p className="text-sm text-gray-600">{result.feedback}</p>
                  </div>
                )}

                {result.markingPoints && result.markingPoints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Marking Points:</h4>
                    <div className="space-y-2">
                      {result.markingPoints.map((point, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          {point.awarded ? (
                            <CheckCircleIcon className="h-4 w-4 text-success-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-error-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <span className="text-sm font-medium text-gray-900">{point.id}:</span>
                            <span className="text-sm text-gray-600 ml-1">{point.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <Link to="/submit" className="btn-primary">
          Submit Another Paper
        </Link>
        <Link to="/dashboard" className="btn-secondary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}