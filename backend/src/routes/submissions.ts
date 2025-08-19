import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthenticatedRequest, requireVerified } from '@/middleware/auth';
import { upload, handleMulterError } from '@/middleware/upload';
import { NotFoundError, ValidationError } from '@/middleware/error-handler';
import { OCRService } from '@/services/ocr-service';
import { OpenAIMarkingService } from '@/services/openaiService';
import { logger } from '@/utils/logger';

const router = express.Router();
const prisma = new PrismaClient();
const ocrService = new OCRService();
const markingService = new OpenAIMarkingService();

const createSubmissionSchema = z.object({
  paperId: z.string().cuid('Invalid paper ID'),
});

router.post(
  '/',
  authenticate,
  requireVerified,
  upload.single('file'),
  handleMulterError,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const validatedData = createSubmissionSchema.parse(req.body);

      const paper = await prisma.paper.findUnique({
        where: { id: validatedData.paperId },
        include: {
          examBoard: true,
          markscheme: true,
        },
      });

      if (!paper) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        throw new NotFoundError('Paper not found');
      }

      if (!paper.markscheme) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        throw new ValidationError('No markscheme available for this paper');
      }

      const submission = await prisma.submission.create({
        data: {
          userId: req.user!.id,
          paperId: validatedData.paperId,
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          status: 'UPLOADED',
        },
        include: {
          paper: {
            include: {
              examBoard: true,
            },
          },
        },
      });

      processSubmissionAsync(submission.id);

      logger.info(`Submission created: ${submission.id} by user ${req.user!.email}`);

      res.status(201).json({
        success: true,
        data: submission,
        message: 'File uploaded successfully. Processing will begin shortly.',
      });
    } catch (error) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Failed to delete uploaded file', { path: req.file.path, error: unlinkError });
        }
      }
      next(error);
    }
  }
);

async function processSubmissionAsync(submissionId: string) {
  try {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'PROCESSING' },
    });

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        paper: {
          include: {
            markscheme: true,
          },
        },
      },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    if (!submission.paper.markscheme) {
      throw new Error('No markscheme available for this paper');
    }

    const startTime = Date.now();

    // Step 1: OCR Processing
    const fileBuffer = fs.readFileSync(submission.filePath);
    const ocrResult = await ocrService.processPDF(fileBuffer, submission.fileName);

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'OCR_COMPLETE',
        ocrText: ocrResult.text,
        extractedData: ocrResult as any,
      },
    });

    logger.info(`OCR completed for submission: ${submissionId}`, {
      textLength: ocrResult.text.length
    });

    // Step 2: OpenAI Marking
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'MARKING' },
    });

    logger.info(`Starting OpenAI marking for submission: ${submissionId}`, {
      textLength: ocrResult.text.length,
      markschemeQuestions: submission.paper.markscheme.content?.questions?.length || 0
    });

    const markschemeContent = submission.paper.markscheme.content as any;
    const markingResults = await markingService.markSubmission({
      studentAnswers: ocrResult.text,
      markscheme: markschemeContent,
      submissionId: submissionId
    });

    logger.info(`Marking completed for submission: ${submissionId}`, {
      totalScore: markingResults.totalScore,
      maxScore: markingResults.maxScore,
      questionsMarked: markingResults.questionResults.length
    });

    // Step 3: Store results in database
    // Delete existing results if any
    await prisma.markingResult.deleteMany({
      where: { submissionId: submissionId }
    });

    // Create new results
    const resultPromises = markingResults.questionResults.map(result => 
      prisma.markingResult.create({
        data: {
          submissionId: submissionId,
          questionId: result.questionId,
          studentAnswer: result.studentAnswer || '',
          marksAwarded: result.marksAwarded,
          maxMarks: result.maxMarks,
          isCorrect: result.isCorrect,
          feedback: result.feedback || '',
          confidence: result.confidence || 1.0,
          markingPoints: result.markingPoints as any || [],
        }
      })
    );

    await Promise.all(resultPromises);

    const processingTime = Date.now() - startTime;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'MARKING_COMPLETE',
        processingTime,
        totalScore: markingResults.totalScore,
        maxScore: markingResults.maxScore,
        percentage: markingResults.percentage,
        grade: markingResults.grade,
      },
    });

    logger.info(`Processing completed for submission: ${submissionId} in ${processingTime}ms`, {
      finalScore: `${markingResults.totalScore}/${markingResults.maxScore}`,
      percentage: `${markingResults.percentage.toFixed(1)}%`,
      grade: markingResults.grade
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(`Processing failed for submission: ${submissionId}`, { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      submissionId
    });
    
    // Determine the specific failure type
    let detailedErrorMessage = errorMessage;
    if (errorMessage.includes('OpenAI API key')) {
      detailedErrorMessage = 'OpenAI API configuration error. Please check API key setup.';
    } else if (errorMessage.includes('OpenAI')) {
      detailedErrorMessage = `OpenAI marking failed: ${errorMessage}`;
    } else if (errorMessage.includes('OCR')) {
      detailedErrorMessage = `OCR processing failed: ${errorMessage}`;
    }
    
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'FAILED',
        errorMessage: detailedErrorMessage,
      },
    });
  }
}

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = { userId: req.user!.id };
    if (status) {
      where.status = status;
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          paper: {
            include: {
              examBoard: true,
            },
          },
          results: {
            select: {
              questionId: true,
              marksAwarded: true,
              maxMarks: true,
              isCorrect: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        paper: {
          include: {
            examBoard: true,
            markscheme: true,
          },
        },
        results: {
          orderBy: { questionId: 'asc' },
        },
      },
    });

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (fs.existsSync(submission.filePath)) {
      try {
        fs.unlinkSync(submission.filePath);
      } catch (error) {
        logger.error('Failed to delete submission file', { path: submission.filePath, error });
      }
    }

    await prisma.submission.delete({
      where: { id: req.params.id },
    });

    logger.info(`Submission deleted: ${req.params.id} by user ${req.user!.email}`);

    res.json({
      success: true,
      message: 'Submission deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;