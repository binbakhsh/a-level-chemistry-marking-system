export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface MarkingPoint {
  id: string;
  marks: number;
  criteria: string;
  keywords?: string[];
}

export interface Question {
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
  commonErrors?: Array<{
    error: string;
    feedback: string;
  }>;
  explanation?: string;
}

export interface MarkschemeContent {
  version: string;
  questions: Question[];
  markingRules: {
    listPenalty: boolean;
    consequentialMarking: boolean;
    spellingTolerance: 'strict' | 'moderate' | 'lenient';
    chemicalFormulaTolerance: 'strict' | 'moderate';
  };
}

export interface SubmissionFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  equations?: string[];
  tables?: any[];
  metadata?: {
    pageCount: number;
    processingTime: number;
  };
}

export interface ExtractedAnswer {
  questionId: string;
  answer: string;
  confidence: number;
  position: {
    page: number;
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface MarkingResultData {
  questionId: string;
  studentAnswer: string;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  markingPoints: Array<{
    id: string;
    awarded: boolean;
    reason: string;
  }>;
  isCorrect: boolean;
  confidence: number;
}

export interface FeedbackSummary {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade?: string;
  strengths: string[];
  improvements: string[];
  questionBreakdown: MarkingResultData[];
}

export interface ChemicalEquation {
  reactants: string[];
  products: string[];
  coefficients: number[];
  isBalanced: boolean;
}

export interface FormulaValidation {
  formula: string;
  isValid: boolean;
  standardForm: string;
  errors: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}