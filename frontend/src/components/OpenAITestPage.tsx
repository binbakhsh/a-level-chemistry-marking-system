import React, { useState } from 'react';

interface MarkingResult {
  score: number;
  maxScore: number;
  feedback: string;
  breakdown: Array<{
    point: string;
    awarded: boolean;
    reason: string;
  }>;
}

const OpenAITestPage: React.FC = () => {
  const [formData, setFormData] = useState({
    question: 'Calculate the pH of a 0.1 M solution of hydrochloric acid (HCl).',
    markScheme: `Marking Scheme:
1 mark for recognizing HCl as a strong acid
1 mark for the correct calculation: pH = -log[H+] = -log(0.1) = 1
Total: 2 marks

Accepted answers: pH = 1, pH = 1.0`,
    studentAnswer: 'HCl is a strong acid that completely dissociates. [H+] = 0.1 M. pH = -log(0.1) = 1',
    totalMarks: 2
  });
  
  const [result, setResult] = useState<MarkingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalMarks' ? parseInt(value) || 0 : value
    }));
  };

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/openai/validate-connection');
      const data = await response.json();
      
      if (data.success && data.connected) {
        setConnectionStatus('✅ OpenAI connection successful');
      } else {
        setConnectionStatus('❌ OpenAI connection failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setConnectionStatus('❌ Connection test failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/openai/test-marking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'Failed to mark answer');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">OpenAI Marking Test</h1>
        
        <div className="mb-6">
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
          >
            {loading ? 'Testing...' : 'Test OpenAI Connection'}
          </button>
          {connectionStatus && (
            <p className="mt-2 text-sm font-medium">{connectionStatus}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              Question
            </label>
            <textarea
              id="question"
              name="question"
              value={formData.question}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label htmlFor="markScheme" className="block text-sm font-medium text-gray-700 mb-2">
              Mark Scheme
            </label>
            <textarea
              id="markScheme"
              name="markScheme"
              value={formData.markScheme}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              required
            />
          </div>

          <div>
            <label htmlFor="studentAnswer" className="block text-sm font-medium text-gray-700 mb-2">
              Student Answer
            </label>
            <textarea
              id="studentAnswer"
              name="studentAnswer"
              value={formData.studentAnswer}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>

          <div>
            <label htmlFor="totalMarks" className="block text-sm font-medium text-gray-700 mb-2">
              Total Marks
            </label>
            <input
              type="number"
              id="totalMarks"
              name="totalMarks"
              value={formData.totalMarks}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium"
          >
            {loading ? 'Marking...' : 'Mark with OpenAI'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Marking Result</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Score:</span>
                <span className="text-lg font-bold">{result.score}/{result.maxScore}</span>
              </div>
              
              <div>
                <span className="font-medium">Feedback:</span>
                <p className="mt-1 text-gray-700">{result.feedback}</p>
              </div>
              
              <div>
                <span className="font-medium">Marking Breakdown:</span>
                <div className="mt-2 space-y-2">
                  {result.breakdown.map((point, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md border ${
                        point.awarded 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{point.point}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          point.awarded 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {point.awarded ? 'Awarded' : 'Not Awarded'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{point.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenAITestPage;