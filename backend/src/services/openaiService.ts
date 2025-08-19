import OpenAI from 'openai';

export interface MarkingRequest {
  question: string;
  markScheme: string;
  studentAnswer: string;
  totalMarks: number;
}

export interface MarkingResult {
  score: number;
  maxScore: number;
  feedback: string;
  breakdown: Array<{
    point: string;
    awarded: boolean;
    reason: string;
  }>;
}

export interface SubmissionMarkingRequest {
  studentAnswers: string;
  markscheme: any;
  submissionId: string;
}

export interface QuestionResult {
  questionId: string;
  studentAnswer?: string;
  marksAwarded: number;
  maxMarks: number;
  isCorrect: boolean;
  feedback?: string;
  confidence?: number;
  markingPoints?: Array<{
    id: string;
    awarded: boolean;
    reason: string;
  }>;
}

export interface SubmissionMarkingResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  questionResults: QuestionResult[];
  summary: {
    correctAnswers: number;
    totalQuestions: number;
    accuracyRate: number;
    strengths: string[];
    improvements: string[];
  };
}

export class OpenAIMarkingService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'placeholder-key',
    });
  }

  async markAnswer(request: MarkingRequest): Promise<MarkingResult> {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    const prompt = this.buildMarkingPrompt(request);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert AQA A-Level Chemistry examiner. You must mark student answers according to the provided mark scheme with precision and consistency. Return your response as valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response) as MarkingResult;
    } catch (error) {
      console.error('OpenAI marking error:', error);
      throw new Error('Failed to mark answer using OpenAI');
    }
  }

  private buildMarkingPrompt(request: MarkingRequest): string {
    return `
Mark this AQA A-Level Chemistry student answer according to the provided mark scheme.

QUESTION:
${request.question}

MARK SCHEME:
${request.markScheme}

STUDENT ANSWER:
${request.studentAnswer}

MARKING INSTRUCTIONS:
1. Award marks only for points explicitly mentioned in the mark scheme
2. Apply AQA marking principles:
   - Accept alternative correct answers unless mark scheme specifies "only"
   - Apply list penalty: if student gives correct and incorrect answers, award no marks
   - Check for consequential marking (ECF) where applicable
   - Be precise with chemical terminology and equations
3. For each marking point, explain whether it was awarded and why
4. Provide constructive feedback for improvement

Return your response as JSON with this exact structure:
{
  "score": number,
  "maxScore": ${request.totalMarks},
  "feedback": "Overall feedback on the answer",
  "breakdown": [
    {
      "point": "Description of marking point",
      "awarded": boolean,
      "reason": "Explanation of why mark was/wasn't awarded"
    }
  ]
}`;
  }

  async markSubmission(request: SubmissionMarkingRequest): Promise<SubmissionMarkingResult> {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.');
    }

    const prompt = this.buildSubmissionMarkingPrompt(request);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert AQA A-Level Chemistry examiner. You must mark complete student submissions according to the provided mark scheme with precision and consistency. Return your response as valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(response) as SubmissionMarkingResult;
      
      // Calculate percentage and grade
      result.percentage = result.maxScore > 0 ? (result.totalScore / result.maxScore) * 100 : 0;
      result.grade = this.calculateGrade(result.percentage);
      
      return result;
    } catch (error) {
      console.error('OpenAI submission marking error:', error);
      throw new Error('Failed to mark submission using OpenAI');
    }
  }

  private buildSubmissionMarkingPrompt(request: SubmissionMarkingRequest): string {
    const markscheme = request.markscheme;
    const questions = markscheme.questions || [];
    
    return `
Mark this complete AQA A-Level Chemistry student submission according to the provided mark scheme.

MARK SCHEME INFORMATION:
- Total Questions: ${questions.length}
- Total Marks: ${markscheme.totalMarks}
- Paper: ${markscheme.paperCode || 'AQA Chemistry A-Level'}

MARK SCHEME DETAILS:
${JSON.stringify(questions, null, 2)}

STUDENT ANSWER SHEET (OCR EXTRACTED):
${request.studentAnswers}

MARKING INSTRUCTIONS:
1. Parse the student's answers from the OCR text and match them to the corresponding questions
2. Mark each question according to the mark scheme criteria
3. Award marks only for points explicitly mentioned in the mark scheme
4. Apply AQA marking principles:
   - Accept alternative correct answers unless mark scheme specifies "only"
   - Apply list penalty: if student gives correct and incorrect answers, award no marks
   - Check for consequential marking (ECF) where applicable
   - Be precise with chemical terminology and equations
   - Consider partial credit where appropriate
5. For each question, provide detailed feedback explaining the marking
6. Identify strengths and areas for improvement

Return your response as JSON with this exact structure:
{
  "totalScore": number,
  "maxScore": ${markscheme.totalMarks},
  "questionResults": [
    {
      "questionId": "1a",
      "studentAnswer": "Student's answer text",
      "marksAwarded": number,
      "maxMarks": number,
      "isCorrect": boolean,
      "feedback": "Detailed feedback for this question",
      "confidence": number_between_0_and_1,
      "markingPoints": [
        {
          "id": "M1",
          "awarded": boolean,
          "reason": "Explanation of why mark was/wasn't awarded"
        }
      ]
    }
  ],
  "summary": {
    "correctAnswers": number,
    "totalQuestions": ${questions.length},
    "accuracyRate": number,
    "strengths": ["List of strengths demonstrated"],
    "improvements": ["List of areas for improvement"]
  }
}

CRITICAL: Make sure to extract and evaluate ALL ${questions.length} questions from the student submission. Match each question ID exactly as specified in the mark scheme.`;
  }

  private calculateGrade(percentage: number): string {
    if (percentage >= 80) return 'A*';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    if (percentage >= 30) return 'E';
    return 'U';
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test connection" }],
        max_tokens: 5
      });
      return !!response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI connection validation failed:', error);
      return false;
    }
  }
}