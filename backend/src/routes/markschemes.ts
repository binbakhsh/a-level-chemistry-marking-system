import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest, requireRole } from '@/middleware/auth';
import { NotFoundError, ValidationError } from '@/middleware/error-handler';
import { MarkschemeContent } from '@/types';

const router = express.Router();
const prisma = new PrismaClient();

const markschemeSchema = z.object({
  paperId: z.string().cuid(),
  content: z.any(),
  version: z.string().default('1.0'),
});

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const examBoardCode = req.query.examBoard as string;
    const paperCode = req.query.paperCode as string;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const session = req.query.session as string;

    let where: any = {};

    if (examBoardCode || paperCode || year || session) {
      where.paper = {};
      
      if (examBoardCode) {
        where.paper.examBoard = { code: examBoardCode };
      }
      
      if (paperCode) {
        where.paper.code = paperCode;
      }
      
      if (year) {
        where.paper.year = year;
      }
      
      if (session) {
        where.paper.session = session;
      }
    }

    const markschemes = await prisma.markscheme.findMany({
      where,
      include: {
        paper: {
          include: {
            examBoard: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: markschemes,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const markscheme = await prisma.markscheme.findUnique({
      where: { id: req.params.id },
      include: {
        paper: {
          include: {
            examBoard: true,
          },
        },
      },
    });

    if (!markscheme) {
      throw new NotFoundError('Markscheme not found');
    }

    res.json({
      success: true,
      data: markscheme,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/paper/:paperId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const markscheme = await prisma.markscheme.findUnique({
      where: { paperId: req.params.paperId },
      include: {
        paper: {
          include: {
            examBoard: true,
          },
        },
      },
    });

    if (!markscheme) {
      throw new NotFoundError('Markscheme not found for this paper');
    }

    res.json({
      success: true,
      data: markscheme,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const validatedData = markschemeSchema.parse(req.body);
    
    const paper = await prisma.paper.findUnique({
      where: { id: validatedData.paperId },
    });

    if (!paper) {
      throw new NotFoundError('Paper not found');
    }

    const existingMarkscheme = await prisma.markscheme.findUnique({
      where: { paperId: validatedData.paperId },
    });

    if (existingMarkscheme) {
      throw new ValidationError('Markscheme already exists for this paper');
    }

    const content = validatedData.content as MarkschemeContent;
    
    const questionCount = content.questions?.length || 0;
    const totalMarks = content.questions?.reduce((sum, q) => sum + q.maxMarks, 0) || 0;

    const markscheme = await prisma.markscheme.create({
      data: {
        paperId: validatedData.paperId,
        content: validatedData.content,
        version: validatedData.version,
        questionCount,
        totalMarks,
        isActive: true,
      },
      include: {
        paper: {
          include: {
            examBoard: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: markscheme,
      message: 'Markscheme created successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const existingMarkscheme = await prisma.markscheme.findUnique({
      where: { id: req.params.id },
    });

    if (!existingMarkscheme) {
      throw new NotFoundError('Markscheme not found');
    }

    const { content, version } = req.body;
    
    const markschemeContent = content as MarkschemeContent;
    const questionCount = markschemeContent.questions?.length || 0;
    const totalMarks = markschemeContent.questions?.reduce((sum, q) => sum + q.maxMarks, 0) || 0;

    const markscheme = await prisma.markscheme.update({
      where: { id: req.params.id },
      data: {
        content,
        version: version || existingMarkscheme.version,
        questionCount,
        totalMarks,
        updatedAt: new Date(),
      },
      include: {
        paper: {
          include: {
            examBoard: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: markscheme,
      message: 'Markscheme updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const markscheme = await prisma.markscheme.findUnique({
      where: { id: req.params.id },
    });

    if (!markscheme) {
      throw new NotFoundError('Markscheme not found');
    }

    await prisma.markscheme.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Markscheme deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;