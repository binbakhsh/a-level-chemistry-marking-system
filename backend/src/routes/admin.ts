import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthenticatedRequest, requireRole } from '@/middleware/auth';
import { upload, handleMulterError } from '@/middleware/upload';
import { NotFoundError, ValidationError } from '@/middleware/error-handler';
import { MarkschemeParser } from '@/services/markschemeParser';
import { logger } from '@/utils/logger';

const router = express.Router();
const prisma = new PrismaClient();
const markschemeParser = new MarkschemeParser();

const createPaperSchema = z.object({
  examBoardId: z.string().cuid('Invalid exam board ID'),
  code: z.string().min(1, 'Paper code is required'),
  title: z.string().min(1, 'Paper title is required'),
  subject: z.string().min(1, 'Subject is required'),
  level: z.string().min(1, 'Level is required'),
  year: z.number().min(2020).max(2030),
  session: z.enum(['January', 'February', 'March', 'May', 'June', 'October', 'November']),
  duration: z.number().optional(),
  totalMarks: z.number().min(1),
  totalQuestions: z.number().min(1).max(50),
  totalSubparts: z.number().min(1).max(200),
});

const uploadMarkschemeSchema = z.object({
  paperId: z.string().cuid('Invalid paper ID'),
  version: z.string().default('1.0'),
});

// Get all exam boards
router.get('/exam-boards', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const examBoards = await prisma.examBoard.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { papers: true }
        }
      }
    });

    res.json({
      success: true,
      data: examBoards
    });
  } catch (error) {
    next(error);
  }
});

// Create new paper
router.post('/papers', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const validatedData = createPaperSchema.parse(req.body);

    // Check if paper already exists
    const existingPaper = await prisma.paper.findFirst({
      where: {
        examBoardId: validatedData.examBoardId,
        code: validatedData.code,
        year: validatedData.year,
        session: validatedData.session,
      },
    });

    if (existingPaper) {
      throw new ValidationError('A paper with this code, year, and session already exists for this exam board');
    }

    const paper = await prisma.paper.create({
      data: {
        ...validatedData,
        isActive: true,
      },
      include: {
        examBoard: true,
      },
    });

    logger.info(`Paper created: ${paper.code} by admin ${req.user!.email}`);

    res.status(201).json({
      success: true,
      data: paper,
      message: 'Paper created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get all papers for admin
router.get('/papers', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const examBoardId = req.query.examBoardId as string;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const subject = req.query.subject as string;

    const where: any = { isActive: true };
    if (examBoardId) where.examBoardId = examBoardId;
    if (year) where.year = year;
    if (subject) where.subject = { contains: subject, mode: 'insensitive' };

    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        include: {
          examBoard: true,
          markscheme: true,
          _count: {
            select: { submissions: true }
          }
        },
        orderBy: [
          { year: 'desc' },
          { session: 'desc' },
          { code: 'asc' }
        ],
        skip: offset,
        take: limit,
      }),
      prisma.paper.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        papers,
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

// Get individual paper details
router.get('/papers/:paperId', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { paperId } = req.params;

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        examBoard: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        markscheme: {
          select: {
            id: true,
            version: true,
            questionCount: true,
            totalMarks: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        error: 'Paper not found',
      });
    }

    res.json({
      success: true,
      data: paper,
    });
  } catch (error) {
    next(error);
  }
});

// Upload markscheme for a paper
router.post(
  '/papers/:paperId/markscheme',
  authenticate,
  requireRole(['ADMIN']),
  upload.single('markscheme'),
  handleMulterError,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError('No markscheme file uploaded');
      }

      const validatedData = uploadMarkschemeSchema.parse({
        paperId: req.params.paperId,
        ...req.body,
      });

      const paper = await prisma.paper.findUnique({
        where: { id: validatedData.paperId },
        include: { examBoard: true }
      });

      if (!paper) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        throw new NotFoundError('Paper not found');
      }

      // Parse the markscheme with metadata guidance
      const fileBuffer = fs.readFileSync(req.file.path);
      const parseResult = await markschemeParser.parseMarkscheme(fileBuffer, req.file.originalname, {
        totalMarks: paper.totalMarks,
        totalQuestions: paper.totalQuestions,
        totalSubparts: paper.totalSubparts
      });

      // Calculate total marks and question count
      const totalMarks = parseResult.questions.reduce((sum, q) => sum + q.maxMarks, 0);
      const questionCount = parseResult.questions.length;

      // Validate parsed results against expected metadata
      const validationWarnings = [];
      
      if (paper.totalMarks && Math.abs(totalMarks - paper.totalMarks) > 5) {
        validationWarnings.push(`Parsed marks (${totalMarks}) differ significantly from expected (${paper.totalMarks})`);
      }
      
      if (paper.totalSubparts && Math.abs(questionCount - paper.totalSubparts) > 3) {
        validationWarnings.push(`Parsed questions (${questionCount}) differ from expected subparts (${paper.totalSubparts})`);
      }

      // Log validation results
      if (validationWarnings.length > 0) {
        logger.warn(`Markscheme validation warnings for ${req.file.originalname}:`, validationWarnings);
      } else {
        logger.info(`Markscheme validation successful for ${req.file.originalname}`, {
          expectedMarks: paper.totalMarks,
          parsedMarks: totalMarks,
          expectedSubparts: paper.totalSubparts,
          parsedQuestions: questionCount
        });
      }

      // Create or update markscheme
      const markscheme = await prisma.markscheme.upsert({
        where: { paperId: validatedData.paperId },
        update: {
          version: validatedData.version,
          content: parseResult,
          totalMarks,
          questionCount,
          isActive: true,
        },
        create: {
          paperId: validatedData.paperId,
          version: validatedData.version,
          content: parseResult,
          totalMarks,
          questionCount,
          isActive: true,
        },
      });

      // Update paper total marks if different
      if (paper.totalMarks !== totalMarks) {
        await prisma.paper.update({
          where: { id: validatedData.paperId },
          data: { totalMarks },
        });
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      logger.info(`Markscheme uploaded for paper: ${paper.code} by admin ${req.user!.email}`, {
        markschemeId: markscheme.id,
        totalMarks,
        questionCount,
      });

      res.status(201).json({
        success: true,
        data: {
          markscheme,
          validationWarnings,
          parseResult: {
            totalMarks,
            questionCount,
            questions: parseResult.questions.length,
          }
        },
        message: 'Markscheme uploaded and parsed successfully',
      });
    } catch (error) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Failed to delete uploaded markscheme file', { path: req.file.path, error: unlinkError });
        }
      }
      next(error);
    }
  }
);

// Get markscheme details
router.get('/papers/:paperId/markscheme', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const markscheme = await prisma.markscheme.findUnique({
      where: { paperId: req.params.paperId },
      include: {
        paper: {
          include: {
            examBoard: true
          }
        }
      }
    });

    if (!markscheme) {
      throw new NotFoundError('Markscheme not found');
    }

    res.json({
      success: true,
      data: markscheme
    });
  } catch (error) {
    next(error);
  }
});

// Delete paper and its markscheme
router.delete('/papers/:id', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const paper = await prisma.paper.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    });

    if (!paper) {
      throw new NotFoundError('Paper not found');
    }

    // Check if paper has submissions
    if (paper._count.submissions > 0) {
      // Soft delete - deactivate instead of removing
      await prisma.paper.update({
        where: { id: req.params.id },
        data: { isActive: false }
      });

      logger.info(`Paper soft deleted: ${paper.code} by admin ${req.user!.email}`);

      res.json({
        success: true,
        message: 'Paper deactivated (has existing submissions)',
      });
    } else {
      // Hard delete if no submissions
      await prisma.paper.delete({
        where: { id: req.params.id }
      });

      logger.info(`Paper deleted: ${paper.code} by admin ${req.user!.email}`);

      res.json({
        success: true,
        message: 'Paper deleted successfully',
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get admin statistics
router.get('/stats', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const [
      totalPapers,
      totalMarkschemes,
      totalSubmissions,
      recentSubmissions,
      papersByExamBoard
    ] = await Promise.all([
      prisma.paper.count({ where: { isActive: true } }),
      prisma.markscheme.count({ where: { isActive: true } }),
      prisma.submission.count(),
      prisma.submission.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          paper: {
            select: { code: true, title: true }
          }
        }
      }),
      prisma.paper.groupBy({
        by: ['examBoardId'],
        where: { isActive: true },
        _count: true,
        orderBy: {
          _count: {
            examBoardId: 'desc'
          }
        }
      })
    ]);

    // Get exam board names for the groupBy result
    const examBoardIds = papersByExamBoard.map(p => p.examBoardId);
    const examBoards = await prisma.examBoard.findMany({
      where: { id: { in: examBoardIds } },
      select: { id: true, name: true, code: true }
    });

    const papersByExamBoardWithNames = papersByExamBoard.map(group => {
      const examBoard = examBoards.find(eb => eb.id === group.examBoardId);
      return {
        examBoard: examBoard ? `${examBoard.name} (${examBoard.code})` : 'Unknown',
        count: group._count
      };
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalPapers,
          totalMarkschemes,
          totalSubmissions,
          markschemeComplete: ((totalMarkschemes / totalPapers) * 100).toFixed(1)
        },
        recentSubmissions,
        papersByExamBoard: papersByExamBoardWithNames
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;