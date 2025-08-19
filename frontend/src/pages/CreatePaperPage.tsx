import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/services/api';
import { ExamBoard } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

interface CreatePaperForm {
  examBoardId: string;
  code: string;
  title: string;
  subject: string;
  level: string;
  year: number;
  session: string;
  duration: number;
  totalMarks: number;
  totalQuestions: number;
  totalSubparts: number;
}

const SESSIONS = [
  'January', 'February', 'March', 'May', 'June', 'October', 'November'
];

const SUBJECTS = [
  'Chemistry', 'Biology', 'Physics', 'Mathematics', 'English Literature', 
  'English Language', 'History', 'Geography', 'Psychology', 'Economics'
];

const LEVELS = [
  'GCSE', 'A-level', 'AS-level', 'International A-level', 'International GCSE'
];

export default function CreatePaperPage() {
  const navigate = useNavigate();
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreatePaperForm>({
    examBoardId: '',
    code: '',
    title: '',
    subject: 'Chemistry',
    level: 'A-level',
    year: new Date().getFullYear(),
    session: 'June',
    duration: 105,
    totalMarks: 100,
    totalQuestions: 6,
    totalSubparts: 20,
  });

  useEffect(() => {
    const fetchExamBoards = async () => {
      try {
        const response = await apiClient.get<ExamBoard[]>('/admin/exam-boards');
        if (response.data) {
          setExamBoards(response.data);
        }
      } catch (err) {
        setError('Failed to load exam boards');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamBoards();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiClient.post('/admin/papers', formData);
      if (response.success) {
        // Navigate to markscheme upload page for this paper
        navigate(`/admin/papers/${response.data.id}/upload-markscheme`, {
          state: {
            paperData: response.data,
            message: `Paper ${response.data.code} created successfully! Now upload its markscheme.`,
            type: 'success'
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['year', 'duration', 'totalMarks', 'totalQuestions', 'totalSubparts'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseInt(value) || 0 : value,
    }));
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
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to="/admin" className="btn-secondary">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Admin
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Paper</h1>
          <p className="text-gray-600">Add a new exam paper to the system</p>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Paper Details</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Exam Board */}
              <div>
                <label htmlFor="examBoardId" className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Board *
                </label>
                <select
                  id="examBoardId"
                  name="examBoardId"
                  value={formData.examBoardId}
                  onChange={handleChange}
                  required
                  className="input w-full"
                >
                  <option value="">Select exam board</option>
                  {examBoards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name} ({board.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Paper Code */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Paper Code *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g., 7405/1"
                  required
                  className="input w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the official paper code (e.g., 7405/1, 9CHO/1H)
                </p>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="input w-full"
                >
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level */}
              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                  Level *
                </label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  required
                  className="input w-full"
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                  Year *
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  min="2020"
                  max="2030"
                  required
                  className="input w-full"
                />
              </div>

              {/* Session */}
              <div>
                <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-2">
                  Session *
                </label>
                <select
                  id="session"
                  name="session"
                  value={formData.session}
                  onChange={handleChange}
                  required
                  className="input w-full"
                >
                  {SESSIONS.map((session) => (
                    <option key={session} value={session}>
                      {session}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="30"
                  max="300"
                  className="input w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty if not applicable
                </p>
              </div>

              {/* Total Marks */}
              <div>
                <label htmlFor="totalMarks" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Marks *
                </label>
                <input
                  type="number"
                  id="totalMarks"
                  name="totalMarks"
                  value={formData.totalMarks}
                  onChange={handleChange}
                  min="1"
                  max="1000"
                  required
                  className="input w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Expected total marks for this paper
                </p>
              </div>

              {/* Total Questions */}
              <div>
                <label htmlFor="totalQuestions" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Questions *
                </label>
                <input
                  type="number"
                  id="totalQuestions"
                  name="totalQuestions"
                  value={formData.totalQuestions}
                  onChange={handleChange}
                  min="1"
                  max="50"
                  required
                  className="input w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Number of main questions (e.g., Q1, Q2, Q3...)
                </p>
              </div>

              {/* Total Subparts */}
              <div>
                <label htmlFor="totalSubparts" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Subparts *
                </label>
                <input
                  type="number"
                  id="totalSubparts"
                  name="totalSubparts"
                  value={formData.totalSubparts}
                  onChange={handleChange}
                  min="1"
                  max="200"
                  required
                  className="input w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Total number of subparts (e.g., 1a, 1b, 2a, 2b...)
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Paper Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., A-level Chemistry Paper 1: Inorganic and Physical Chemistry"
                required
                className="input w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the full official title of the paper
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link to="/admin" className="btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Paper
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              What happens next?
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                After creating the paper, you'll be able to upload and associate a markscheme with it. 
                Students will then be able to select this paper when submitting their answers for marking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}