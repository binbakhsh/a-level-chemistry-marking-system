import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { MarkschemeParser } from '@/services/markschemeParser';
import { logger } from '@/utils/logger';
import { authenticate, AuthenticatedRequest, requireRole } from '@/middleware/auth';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();
const markschemeParser = new MarkschemeParser();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/markschemes/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

// Upload and process markscheme PDF
router.post('/upload-pdf', authenticate, requireRole(['ADMIN', 'TEACHER']), upload.single('markscheme'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { paperId, examBoard, subject, level } = req.body;

    logger.info('Upload request body:', { paperId, examBoard, subject, level });
    logger.info('Upload file info:', { 
      filename: req.file.originalname, 
      size: req.file.size, 
      mimetype: req.file.mimetype 
    });

    if (!paperId || !examBoard || !subject || !level) {
      return res.status(400).json({ 
        error: 'Missing required fields: paperId, examBoard, subject, level' 
      });
    }

    // Get the exam board
    const examBoardRecord = await prisma.examBoard.findFirst({
      where: { code: examBoard || 'AQA' }
    });

    if (!examBoardRecord) {
      return res.status(400).json({ error: 'Exam board not found. Please ensure AQA exam board exists.' });
    }

    // First, try to find paper by ID
    let paper = await prisma.paper.findFirst({
      where: { id: paperId }
    });

    // If not found by ID, try to find or create by unique combination
    if (!paper) {
      const currentYear = new Date().getFullYear();
      const defaultSession = 'June';
      const defaultCode = '7405/1';

      // Try to find existing paper with this combination
      paper = await prisma.paper.findFirst({
        where: {
          examBoardId: examBoardRecord.id,
          code: defaultCode,
          year: currentYear,
          session: defaultSession
        }
      });

      // If still not found, create new paper
      if (!paper) {
        paper = await prisma.paper.create({
          data: {
            examBoardId: examBoardRecord.id,
            code: defaultCode,
            title: `${subject} ${level} Paper`,
            subject: subject,
            level: level,
            year: currentYear,
            session: defaultSession,
            totalMarks: 100, // Will be updated after processing
          }
        });
      }
    }

    // Check if markscheme already exists for this paper
    let markscheme = await prisma.markscheme.findUnique({
      where: { paperId: paper.id }
    });

    if (markscheme) {
      // Update existing markscheme
      markscheme = await prisma.markscheme.update({
        where: { paperId: paper.id },
        data: {
          version: '1.0',
          totalMarks: 0, // Will be updated after processing
          questionCount: 0, // Will be updated after processing
          content: {
            status: 'PROCESSING',
            stage: 'uploaded',
            originalFilename: req.file.originalname,
          } as any,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new markscheme record
      markscheme = await prisma.markscheme.create({
        data: {
          paperId: paper.id,
          version: '1.0',
          totalMarks: 0, // Will be updated after processing
          questionCount: 0, // Will be updated after processing
          content: {
            status: 'PROCESSING',
            stage: 'uploaded',
            originalFilename: req.file.originalname,
          } as any,
        },
      });
    }

    // Start background processing
    processMarkschemeAsync(markscheme.id, req.file.path, req.file.originalname);

    logger.info(`Markscheme upload initiated: ${markscheme.id}`, {
      filename: req.file.originalname,
      size: req.file.size,
      paperId
    });

    res.json({
      success: true,
      data: {
        id: markscheme.id,
        status: 'PROCESSING',
        stage: 'uploaded',
        message: 'Markscheme uploaded successfully, processing started',
      },
      message: 'Markscheme uploaded successfully, processing started'
    });

  } catch (error) {
    logger.error('Markscheme upload failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: (error as any)?.name,
      cause: (error as any)?.cause,
      meta: (error as any)?.meta
    });
    res.status(500).json({
      error: 'Failed to upload markscheme',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get processing status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const markscheme = await prisma.markscheme.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!markscheme) {
      return res.status(404).json({ error: 'Markscheme not found' });
    }

    const content = markscheme.content as any;

    res.json({
      success: true,
      data: {
        id: markscheme.id,
        status: content.status || 'UNKNOWN',
        stage: content.stage || 'unknown',
        message: content.message || 'Processing...',
        progress: content.progress || 0,
        errorMessage: content.errorMessage || null,
        createdAt: markscheme.createdAt,
        updatedAt: markscheme.updatedAt,
      }
    });

  } catch (error) {
    logger.error('Failed to get markscheme status:', error);
    res.status(500).json({
      error: 'Failed to get processing status',
    });
  }
});

// Background processing function
async function processMarkschemeAsync(markschemeId: string, filePath: string, filename: string) {
  try {
    // Update status: OCR Processing
    await updateMarkschemeStatus(markschemeId, {
      status: 'PROCESSING',
      stage: 'ocr_processing',
      message: 'Processing PDF with OCR...',
      progress: 20,
    });

    // Read the PDF file
    const pdfBuffer = await fs.readFile(filePath);
    
    // Parse the markscheme
    const parsedMarkscheme = await markschemeParser.parseMarkscheme(pdfBuffer, filename);

    // Update status: AI Parsing
    await updateMarkschemeStatus(markschemeId, {
      status: 'PROCESSING',
      stage: 'ai_parsing',
      message: 'AI analyzing mark scheme structure...',
      progress: 60,
    });

    // Convert parsed data to our format
    const markschemeContent: any = {
      status: 'COMPLETE',
      stage: 'complete',
      message: 'Mark scheme processed successfully',
      progress: 100,
      version: '1.0',
      originalFilename: filename,
      ocrText: (parsedMarkscheme as any).ocrText || 'OCR text not available',
      ocrConfidence: (parsedMarkscheme as any).ocrConfidence || 1.0,
      examBoard: parsedMarkscheme.examBoard,
      subject: parsedMarkscheme.subject,
      paperCode: parsedMarkscheme.paperCode,
      level: parsedMarkscheme.level,
      year: parsedMarkscheme.year,
      session: parsedMarkscheme.session,
      questions: parsedMarkscheme.questions.map(q => ({
        id: q.id,
        text: q.text,
        maxMarks: q.maxMarks,
        type: q.type,
        markingPoints: q.markingPoints.map(mp => ({
          id: mp.id,
          marks: mp.marks,
          description: mp.description,
          keywords: mp.keywords || [],
        })),
        acceptedAnswers: q.acceptedAnswers || [],
        correctEquation: q.correctEquation,
        balanceRequired: q.balanceRequired || false,
        stateSymbolsRequired: q.stateSymbolsRequired || false,
      })),
      markingRules: parsedMarkscheme.markingRules,
      totalMarks: parsedMarkscheme.totalMarks,
    };

    // Store parsed data for debugging
    markschemeContent.fullParsedData = parsedMarkscheme;

    // Update with final processed content and counts
    await prisma.markscheme.update({
      where: { id: markschemeId },
      data: {
        content: markschemeContent as any,
        totalMarks: parsedMarkscheme.totalMarks,
        questionCount: parsedMarkscheme.questions.length,
        updatedAt: new Date(),
      },
    });

    // Clean up uploaded file
    await fs.unlink(filePath).catch(err => 
      logger.warn(`Failed to delete uploaded file ${filePath}:`, err)
    );

    logger.info(`Markscheme processing completed: ${markschemeId}`, {
      questionsCount: parsedMarkscheme.questions.length,
      totalMarks: parsedMarkscheme.totalMarks,
    });

  } catch (error) {
    logger.error(`Markscheme processing failed for ${markschemeId}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    await updateMarkschemeStatus(markschemeId, {
      status: 'FAILED',
      stage: 'error',
      message: 'Processing failed',
      progress: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    // Clean up uploaded file on error
    await fs.unlink(filePath).catch(err => 
      logger.warn(`Failed to delete uploaded file ${filePath}:`, err)
    );
  }
}

async function updateMarkschemeStatus(markschemeId: string, updates: any) {
  try {
    await prisma.markscheme.update({
      where: { id: markschemeId },
      data: {
        content: updates,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error(`Failed to update markscheme status for ${markschemeId}:`, error);
  }
}

// Validation endpoint
router.get('/validate-services', async (req: Request, res: Response) => {
  try {
    const isValid = await markschemeParser.validateConnection();
    
    res.json({
      success: true,
      services: {
        ocr: isValid,
        openai: isValid,
      },
      message: isValid ? 'All services are connected' : 'Some services are not available'
    });

  } catch (error) {
    logger.error('Service validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Service validation failed'
    });
  }
});

// Debug endpoint to check OCR content
router.get('/:id/debug', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const markscheme = await prisma.markscheme.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
      },
    });

    if (!markscheme) {
      return res.status(404).json({ error: 'Markscheme not found' });
    }

    const content = markscheme.content as any;
    
    res.json({
      success: true,
      data: {
        id: markscheme.id,
        ocrText: content.ocrText || 'No OCR text found',
        parsedQuestions: content.fullParsedData?.questions || [],
        totalMarks: content.fullParsedData?.totalMarks || 0,
        questionCount: content.fullParsedData?.questions?.length || 0
      }
    });

  } catch (error) {
    logger.error('Failed to get markscheme debug info:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve debug information' 
    });
  }
});

export default router;