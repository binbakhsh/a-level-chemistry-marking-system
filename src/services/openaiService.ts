import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export class OpenAIMarkingService {
  async markAnswer(request: MarkingRequest): Promise<MarkingResult> {
    const prompt = this.buildMarkingPrompt(request);
    
    try {
      const completion = await openai.chat.completions.create({
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

  async validateConnection(): Promise<boolean> {
    try {
      const response = await openai.chat.completions.create({
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