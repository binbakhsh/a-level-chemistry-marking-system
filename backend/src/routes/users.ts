import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireRole } from '@/middleware/auth';
import { NotFoundError } from '@/middleware/error-handler';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/profile', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/submissions', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: { userId: req.user!.id },
        include: {
          paper: {
            include: {
              examBoard: true,
            },
          },
          results: {
            select: {
              id: true,
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
      prisma.submission.count({
        where: { userId: req.user!.id },
      }),
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

router.get('/stats', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const stats = await prisma.submission.aggregate({
      where: { 
        userId: req.user!.id,
        status: 'MARKING_COMPLETE',
      },
      _count: {
        id: true,
      },
      _avg: {
        percentage: true,
      },
      _max: {
        percentage: true,
      },
      _min: {
        percentage: true,
      },
    });

    const recentSubmissions = await prisma.submission.count({
      where: {
        userId: req.user!.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    res.json({
      success: true,
      data: {
        totalSubmissions: stats._count.id,
        averageScore: stats._avg.percentage || 0,
        bestScore: stats._max.percentage || 0,
        worstScore: stats._min.percentage || 0,
        recentSubmissions,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
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

export default router;