import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  DocumentArrowUpIcon, 
  PlusIcon, 
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { apiClient } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface MarkingPoint {
  id: string;
  marks: number;
  criteria: string;
  keywords?: string[];
}

interface Question {
  id: string;
  maxMarks: number;
  type: 'multiple_choice' | 'calculation' | 'chemical_equation' | 'short_answer' | 'extended_response';
  correctAnswer?: string;
  acceptedAnswers?: string[];
  correctEquation?: string;
  markingPoints: MarkingPoint[];
  alternatives?: string[];
  allowedVariations?: string[];
  balanceRequired?: boolean;
  stateSymbolsRequired?: boolean;
  explanation?: string;
}

interface MarkschemeData {
  paperId: string;
  version: string;
  questions: Question[];
  markingRules: {
    listPenalty: boolean;
    consequentialMarking: boolean;
    spellingTolerance: 'strict' | 'moderate' | 'lenient';
    chemicalFormulaTolerance: 'strict' | 'moderate';
  };
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const { register, handleSubmit, watch, setValue } = useForm<MarkschemeData>({
    defaultValues: {
      paperId: 'default-paper', // This should match your paper ID
      version: '1.0',
      questions: [],
      markingRules: {
        listPenalty: true,
        consequentialMarking: true,
        spellingTolerance: 'moderate',
        chemicalFormulaTolerance: 'strict',
      },
    },
  });

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `${(questions.length + 1).toString().padStart(2, '0')}.1`,
      maxMarks: 1,
      type: 'short_answer',
      markingPoints: [
        {
          id: 'M1',
          marks: 1,
          criteria: 'Correct answer',
          keywords: [],
        },
      ],
    };
    
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    setValue('questions', updatedQuestions);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    (updatedQuestions[index] as any)[field] = value;
    setQuestions(updatedQuestions);
    setValue('questions', updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    setValue('questions', updatedQuestions);
  };

  const addMarkingPoint = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    const existingPoints = updatedQuestions[questionIndex].markingPoints;
    const newPoint: MarkingPoint = {
      id: `M${existingPoints.length + 1}`,
      marks: 1,
      criteria: '',
      keywords: [],
    };
    
    updatedQuestions[questionIndex].markingPoints.push(newPoint);
    setQuestions(updatedQuestions);
    setValue('questions', updatedQuestions);
  };

  const updateMarkingPoint = (questionIndex: number, pointIndex: number, field: keyof MarkingPoint, value: any) => {
    const updatedQuestions = [...questions];
    (updatedQuestions[questionIndex].markingPoints[pointIndex] as any)[field] = value;
    setQuestions(updatedQuestions);
    setValue('questions', updatedQuestions);
  };

  const onSubmit = async (data: MarkschemeData) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      // Calculate total marks
      const totalMarks = data.questions.reduce((sum, q) => sum + q.maxMarks, 0);

      const markschemePayload = {
        paperId: data.paperId,
        version: data.version,
        content: {
          version: data.version,
          questions: data.questions,
          markingRules: data.markingRules,
        },
      };

      await apiClient.post('/markschemes', markschemePayload);
      
      setSuccess('Markscheme uploaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload markscheme');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">
          Upload and manage AQA markschemes for automated marking
        </p>
      </div>

      {success && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-md flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Markscheme Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paper ID
              </label>
              <input
                {...register('paperId')}
                type="text"
                className="input"
                placeholder="e.g., default-paper"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                {...register('version')}
                type="text"
                className="input"
                placeholder="e.g., 1.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Questions
              </label>
              <input
                type="number"
                value={questions.length}
                readOnly
                className="input bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Marking Rules */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Marking Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  {...register('markingRules.listPenalty')}
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">List Penalty (right + wrong = wrong)</span>
              </label>
              <label className="flex items-center">
                <input
                  {...register('markingRules.consequentialMarking')}
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Consequential Marking (ECF)</span>
              </label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spelling Tolerance
                </label>
                <select {...register('markingRules.spellingTolerance')} className="input">
                  <option value="strict">Strict</option>
                  <option value="moderate">Moderate</option>
                  <option value="lenient">Lenient</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chemical Formula Tolerance
                </label>
                <select {...register('markingRules.chemicalFormulaTolerance')} className="input">
                  <option value="strict">Strict</option>
                  <option value="moderate">Moderate</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="btn-primary btn text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Question
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Question {question.id}</h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-error-600 hover:text-error-800"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question ID
                    </label>
                    <input
                      type="text"
                      value={question.id}
                      onChange={(e) => updateQuestion(qIndex, 'id', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Marks
                    </label>
                    <input
                      type="number"
                      value={question.maxMarks}
                      onChange={(e) => updateQuestion(qIndex, 'maxMarks', parseInt(e.target.value))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Type
                    </label>
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                      className="input"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="calculation">Calculation</option>
                      <option value="chemical_equation">Chemical Equation</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="extended_response">Extended Response</option>
                    </select>
                  </div>
                </div>

                {/* Type-specific fields */}
                {question.type === 'multiple_choice' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correct Answer
                    </label>
                    <input
                      type="text"
                      value={question.correctAnswer || ''}
                      onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                      className="input"
                      placeholder="e.g., A, B, C, D"
                    />
                  </div>
                )}

                {question.type === 'chemical_equation' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Correct Equation
                      </label>
                      <input
                        type="text"
                        value={question.correctEquation || ''}
                        onChange={(e) => updateQuestion(qIndex, 'correctEquation', e.target.value)}
                        className="input"
                        placeholder="e.g., CaCO3 + 2HCl → CaCl2 + H2O + CO2"
                      />
                    </div>
                    <div className="flex items-center space-x-4 pt-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={question.balanceRequired || false}
                          onChange={(e) => updateQuestion(qIndex, 'balanceRequired', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm">Balance Required</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={question.stateSymbolsRequired || false}
                          onChange={(e) => updateQuestion(qIndex, 'stateSymbolsRequired', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm">State Symbols Required</span>
                      </label>
                    </div>
                  </div>
                )}

                {(question.type === 'calculation' || question.type === 'short_answer') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accepted Answers (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={question.acceptedAnswers?.join(', ') || ''}
                      onChange={(e) => updateQuestion(qIndex, 'acceptedAnswers', e.target.value.split(',').map(s => s.trim()))}
                      className="input"
                      placeholder="e.g., 24.3, 24.30, 24.3 g/mol"
                    />
                  </div>
                )}

                {/* Marking Points */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Marking Points</h4>
                    <button
                      type="button"
                      onClick={() => addMarkingPoint(qIndex)}
                      className="text-primary-600 hover:text-primary-800 text-sm"
                    >
                      + Add Point
                    </button>
                  </div>
                  <div className="space-y-2">
                    {question.markingPoints.map((point, pIndex) => (
                      <div key={pIndex} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-gray-50 rounded">
                        <input
                          type="text"
                          value={point.id}
                          onChange={(e) => updateMarkingPoint(qIndex, pIndex, 'id', e.target.value)}
                          className="input text-sm"
                          placeholder="Point ID"
                        />
                        <input
                          type="number"
                          value={point.marks}
                          onChange={(e) => updateMarkingPoint(qIndex, pIndex, 'marks', parseInt(e.target.value))}
                          className="input text-sm"
                          placeholder="Marks"
                        />
                        <input
                          type="text"
                          value={point.criteria}
                          onChange={(e) => updateMarkingPoint(qIndex, pIndex, 'criteria', e.target.value)}
                          className="input text-sm"
                          placeholder="Criteria"
                        />
                        <input
                          type="text"
                          value={point.keywords?.join(', ') || ''}
                          onChange={(e) => updateMarkingPoint(qIndex, pIndex, 'keywords', e.target.value.split(',').map(s => s.trim()))}
                          className="input text-sm"
                          placeholder="Keywords (comma-separated)"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || questions.length === 0}
            className="btn-primary flex items-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                Upload Markscheme
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}