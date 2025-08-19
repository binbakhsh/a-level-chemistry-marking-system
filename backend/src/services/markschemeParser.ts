import { OpenAIMarkingService } from '@/services/openaiService';
import { OCRService } from '@/services/ocr-service';
import { logger } from '@/utils/logger';
import { config } from '@/utils/config';
import axios from 'axios';

interface MarkingPoint {
  id: string;
  marks: number;
  description: string;
  keywords?: string[];
  acceptableAnswers?: string[];
}

interface ParsedQuestion {
  id: string;
  text: string;
  maxMarks: number;
  type: 'multiple_choice' | 'calculation' | 'chemical_equation' | 'short_answer' | 'extended_response';
  markingPoints: MarkingPoint[];
  acceptedAnswers?: string[];
  correctEquation?: string;
  balanceRequired?: boolean;
  stateSymbolsRequired?: boolean;
}

interface ParsedMarkscheme {
  examBoard: string;
  subject: string;
  paperCode: string;
  level: string;
  year?: number;
  session?: string;
  totalMarks: number;
  questions: ParsedQuestion[];
  markingRules: {
    listPenalty: boolean;
    allowECF: boolean;
    spellingTolerance: 'strict' | 'moderate' | 'lenient';
  };
}

export class MarkschemeParser {
  private ocrService: OCRService;
  private openaiService: OpenAIMarkingService;

  constructor() {
    this.ocrService = new OCRService();
    this.openaiService = new OpenAIMarkingService();
  }

  async parseMarkscheme(
    pdfBuffer: Buffer, 
    filename: string, 
    metadata?: {
      totalMarks?: number;
      totalQuestions?: number;
      totalSubparts?: number;
    }
  ): Promise<ParsedMarkscheme> {
    try {
      logger.info(`Starting markscheme parsing for ${filename}`);

      // Step 1: OCR Processing
      const ocrResult = await this.ocrService.processPDF(pdfBuffer, filename);
      logger.info(`OCR completed for ${filename}`, {
        confidence: ocrResult.confidence,
        textLength: ocrResult.text.length
      });

      // Step 2: AI Parsing
      const parsedMarkscheme = await this.parseWithAI(ocrResult.text, filename, metadata);
      
      // Store OCR text for debugging
      (parsedMarkscheme as any).ocrText = ocrResult.text;
      (parsedMarkscheme as any).ocrConfidence = ocrResult.confidence;
      
      logger.info(`Markscheme parsing completed for ${filename}`, {
        questionCount: parsedMarkscheme.questions.length,
        totalMarks: parsedMarkscheme.totalMarks
      });

      return parsedMarkscheme;

    } catch (error) {
      logger.error(`Markscheme parsing failed for ${filename}:`, error);
      throw new Error(`Failed to parse markscheme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseWithAI(
    ocrText: string, 
    filename: string, 
    metadata?: { totalMarks?: number; totalQuestions?: number; totalSubparts?: number }
  ): Promise<ParsedMarkscheme> {
    // GPT-5 has a massive context window - process entire markscheme for maximum quality
    // No chunking needed - maintain full context and relationships for best results
    logger.info('Processing entire markscheme with GPT-5 for maximum quality', {
      textLength: ocrText.length,
      filename
    });

    const prompt = this.buildParsingPrompt(ocrText, metadata);

    try {
      logger.info('Making OpenAI API request with GPT-5', {
        model: 'gpt-5',
        hasApiKey: !!config.openai.apiKey,
        apiKeyLength: config.openai.apiKey?.length,
        promptLength: prompt.length,
        ocrLength: ocrText.length,
        totalInputSize: prompt.length + ocrText.length
      });

      const requestBody = {
        model: 'gpt-5', // Use GPT-5 for maximum quality and large context window
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing AQA A-Level Chemistry mark schemes. Extract structured marking information with maximum accuracy and completeness. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        // GPT-5 only supports default temperature (1) - removed custom temperature
        max_completion_tokens: 20000, // GPT-5 uses max_completion_tokens instead of max_tokens
        response_format: { type: "json_object" }
      };

      logger.info('About to make axios request', {
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        hasBody: !!requestBody,
        bodySize: JSON.stringify(requestBody).length,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openai.apiKey?.substring(0, 20)}...`
        }
      });

      const response = await axios.post('https://api.openai.com/v1/chat/completions', requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openai.apiKey}`,
        },
        timeout: 600000, // 10 minute timeout for GPT-5 complex analysis
        onUploadProgress: (progressEvent) => {
          logger.info('Upload progress:', {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0
          });
        }
      });

      logger.info('OpenAI API response received', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      const result = response.data;
      logger.info('OpenAI API parsing successful', {
        hasChoices: !!result.choices,
        choicesLength: result.choices?.length,
        hasContent: !!result.choices?.[0]?.message?.content
      });

      const parsedContent = JSON.parse(result.choices[0].message.content);

      return this.validateAndCleanParsedContent(parsedContent);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('Axios error during AI parsing:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          filename,
          apiKeyExists: !!config.openai.apiKey,
          apiKeyLength: config.openai.apiKey?.length
        });
        throw new Error(`OpenAI API error: ${error.response?.status} - ${error.response?.statusText || error.message}`);
      } else {
        logger.error('AI parsing failed:', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          cause: error instanceof Error ? error.cause : undefined,
          name: error instanceof Error ? error.name : undefined,
          code: (error as any)?.code,
          errno: (error as any)?.errno,
          syscall: (error as any)?.syscall,
          address: (error as any)?.address,
          port: (error as any)?.port,
          filename,
          apiKeyExists: !!config.openai.apiKey,
          apiKeyLength: config.openai.apiKey?.length
        });
        throw new Error(`Failed to parse markscheme with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private buildParsingPrompt(
    ocrText: string, 
    metadata?: { totalMarks?: number; totalQuestions?: number; totalSubparts?: number }
  ): string {
    let metadataGuidance = '';
    
    if (metadata) {
      metadataGuidance = `
METADATA GUIDANCE (from user):
- Expected total marks: ${metadata.totalMarks || 'Not specified'}
- Expected main questions: ${metadata.totalQuestions || 'Not specified'}
- Expected subparts: ${metadata.totalSubparts || 'Not specified'}

Use this metadata as guidance to:
1. Validate your parsing completeness
2. Ensure you haven't missed questions or marks
3. Cross-check your calculated totals
4. Alert if there are significant discrepancies
`;
    }

    return `You are an expert at analyzing AQA A-Level Chemistry mark schemes. This is a MARKSCHEME document containing answers and marking criteria only (NOT the question paper).

${metadataGuidance}

IMPORTANT: This markscheme contains ANSWERS and MARKING CRITERIA only. The actual questions students see are in a separate question paper. Extract the marking information for each question reference.

OCR TEXT:
${ocrText}

Return comprehensive JSON with this exact structure:
{
  "examBoard": "AQA",
  "subject": "Chemistry",
  "paperCode": "[extract from document]",
  "level": "A-level", 
  "year": 2024,
  "session": "[extract from document]",
  "totalMarks": 0,
  "questions": [
    {
      "id": "01.1",
      "text": "Question reference only - full question text in separate question paper",
      "maxMarks": 1,
      "type": "calculation|chemical_equation|extended_response|short_answer",
      "markingPoints": [
        {
          "id": "M1",
          "marks": 1,
          "description": "Complete marking criteria from markscheme",
          "keywords": ["essential", "terms"],
          "acceptableAnswers": ["correct answer", "alternative answer"]
        }
      ]
    }
  ],
  "markingRules": {
    "listPenalty": true,
    "allowECF": true,
    "spellingTolerance": "moderate"
  }
}

EXTRACTION REQUIREMENTS:
- For "text" field: Use format "Question [number] - [brief topic]" based on marking criteria
- Extract ALL marking points, acceptable answers, and ECF rules
- Calculate totalMarks by summing all maxMarks
- Include all alternative answers and marking guidance
- Preserve exact mark allocations as shown in markscheme

Focus on extracting comprehensive marking criteria rather than trying to infer question text.`;
  }


  private validateAndCleanParsedContent(content: any): ParsedMarkscheme {
    // Validate required fields and set defaults
    const markscheme: ParsedMarkscheme = {
      examBoard: content.examBoard || 'AQA',
      subject: content.subject || 'Chemistry',
      paperCode: content.paperCode || 'Unknown',
      level: content.level || 'A-level',
      year: content.year || new Date().getFullYear(),
      session: content.session || 'Unknown',
      totalMarks: content.totalMarks || 0,
      questions: [],
      markingRules: {
        listPenalty: content.markingRules?.listPenalty ?? true,
        allowECF: content.markingRules?.allowECF ?? true,
        spellingTolerance: content.markingRules?.spellingTolerance || 'moderate'
      }
    };

    // Process questions
    if (Array.isArray(content.questions)) {
      markscheme.questions = content.questions.map((q: any, index: number) => ({
        id: q.id || `Q${index + 1}`,
        text: q.text || '',
        maxMarks: q.maxMarks || 1,
        type: q.type || 'short_answer',
        markingPoints: Array.isArray(q.markingPoints) ? q.markingPoints.map((mp: any, mpIndex: number) => ({
          id: mp.id || `M${mpIndex + 1}`,
          marks: mp.marks || 1,
          description: mp.description || '',
          keywords: Array.isArray(mp.keywords) ? mp.keywords : [],
          acceptableAnswers: Array.isArray(mp.acceptableAnswers) ? mp.acceptableAnswers : []
        })) : [],
        acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : undefined,
        correctEquation: q.correctEquation || undefined,
        balanceRequired: q.balanceRequired || false,
        stateSymbolsRequired: q.stateSymbolsRequired || false
      }));
    }

    // Calculate total marks if not provided
    if (markscheme.totalMarks === 0) {
      markscheme.totalMarks = markscheme.questions.reduce((sum, q) => sum + q.maxMarks, 0);
    }

    return markscheme;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const ocrValid = await this.ocrService.checkConnection();
      const openaiValid = await this.openaiService.validateConnection();
      
      return ocrValid && openaiValid;
    } catch {
      return false;
    }
  }
}