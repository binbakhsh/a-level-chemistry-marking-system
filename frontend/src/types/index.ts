export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isVerified: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
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

export interface ExamBoard {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface Paper {
  id: string;
  code: string;
  title: string;
  subject: string;
  level: string;
  year: number;
  session: string;
  duration?: number;
  totalMarks: number;
  examBoard: ExamBoard;
}

export interface Submission {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'UPLOADED' | 'PROCESSING' | 'OCR_COMPLETE' | 'MARKING_COMPLETE' | 'FAILED';
  score?: number;
  maxScore?: number;
  percentage?: number;
  errorMessage?: string;
  processingTime?: number;
  createdAt: string;
  updatedAt: string;
  paper: Paper;
}

export interface MarkingResult {
  id: string;
  questionId: string;
  studentAnswer?: string;
  marksAwarded: number;
  maxMarks: number;
  feedback?: string;
  markingPoints?: Array<{
    id: string;
    awarded: boolean;
    reason: string;
  }>;
  isCorrect: boolean;
  confidence?: number;
}

export interface SubmissionFeedback {
  submission: {
    id: string;
    fileName: string;
    status: string;
    createdAt: string;
    processingTime?: number;
  };
  paper: {
    id: string;
    code: string;
    title: string;
    subject: string;
    level: string;
    examBoard: string;
    year: number;
    session: string;
  };
  scores: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    grade: string;
  } | null;
  questionResults: MarkingResult[];
  summary: {
    correctAnswers: number;
    totalQuestions: number;
    accuracyRate: number;
    strengths: string[];
    improvements: string[];
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}