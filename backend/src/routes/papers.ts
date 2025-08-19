import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest, requireRole } from '@/middleware/auth';
import { NotFoundError } from '@/middleware/error-handler';

const router = express.Router();
const prisma = new PrismaClient();

const paperSchema = z.object({
  examBoardId: z.string().cuid(),
  code: z.string(),
  title: z.string(),
  subject: z.string(),
  level: z.string(),
  year: z.number(),
  session: z.string(),
  duration: z.number().optional(),
  totalMarks: z.number(),
});

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const papers = await prisma.paper.findMany({
      include: {
        examBoard: true,
        markscheme: {
          select: {
            id: true,
            version: true,
            totalMarks: true,
            questionCount: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { session: 'desc' },
        { code: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: papers,
    });
  } catch (error) {
    next(error);
  }
});

// New endpoint for student submissions - only papers with completed mark schemes
router.get('/available-for-submission', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    // Get all papers with active mark schemes
    const allPapersWithMarkschemes = await prisma.paper.findMany({
      where: {
        isActive: true,
        markscheme: {
          isActive: true
        }
      },
      include: {
        examBoard: true,
        markscheme: {
          select: {
            id: true,
            version: true,
            totalMarks: true,
            questionCount: true,
            isActive: true,
            content: true,
            updatedAt: true
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { session: 'desc' },
        { code: 'asc' },
      ],
    });

    // Format for student-friendly display (all papers with markschemes are available)
    const availablePapers = allPapersWithMarkschemes.map(paper => ({
      id: paper.id,
      displayName: `${paper.examBoard.name} ${paper.code} - ${paper.session} ${paper.year}`,
      code: paper.code,
      title: paper.title,
      subject: paper.subject,
      level: paper.level,
      year: paper.year,
      session: paper.session,
      totalMarks: paper.totalMarks,
      examBoard: paper.examBoard,
      markscheme: {
        id: paper.markscheme?.id,
        questionCount: paper.markscheme?.questionCount,
        totalMarks: paper.markscheme?.totalMarks
      },
      processedAt: paper.markscheme?.updatedAt
    }));

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json({
      success: true,
      data: availablePapers,
      message: `Found ${availablePapers.length} papers available for submission`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const paper = await prisma.paper.findUnique({
      where: { id: req.params.id },
      include: {
        examBoard: true,
        markscheme: true,
      },
    });

    if (!paper) {
      throw new NotFoundError('Paper not found');
    }

    res.json({
      success: true,
      data: paper,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const validatedData = paperSchema.parse(req.body);
    
    const existingPaper = await prisma.paper.findUnique({
      where: {
        examBoardId_code_year_session: {
          examBoardId: validatedData.examBoardId,
          code: validatedData.code,
          year: validatedData.year,
          session: validatedData.session,
        },
      },
    });

    if (existingPaper) {
      return res.status(400).json({
        success: false,
        message: 'Paper already exists for this exam board, code, year, and session',
      });
    }

    const paper = await prisma.paper.create({
      data: validatedData,
      include: {
        examBoard: true,
      },
    });

    res.status(201).json({
      success: true,
      data: paper,
      message: 'Paper created successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const existingPaper = await prisma.paper.findUnique({
      where: { id: req.params.id },
    });

    if (!existingPaper) {
      throw new NotFoundError('Paper not found');
    }

    const updateData = paperSchema.partial().parse(req.body);

    const paper = await prisma.paper.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        examBoard: true,
        markscheme: {
          select: {
            id: true,
            version: true,
            totalMarks: true,
            questionCount: true,
            isActive: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: paper,
      message: 'Paper updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const paper = await prisma.paper.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!paper) {
      throw new NotFoundError('Paper not found');
    }

    if (paper._count.submissions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete paper with existing submissions',
      });
    }

    await prisma.paper.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Paper deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;