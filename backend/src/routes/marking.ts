import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest, requireRole } from '@/middleware/auth';
import { NotFoundError } from '@/middleware/error-handler';
import { MarkingEngine } from '@/services/marking-engine';
import { logger } from '@/utils/logger';

const router = express.Router();
const prisma = new PrismaClient();
const markingEngine = new MarkingEngine();

router.post('/submissions/:id/mark', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        paper: {
          include: {
            markscheme: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.status !== 'OCR_COMPLETE' && submission.status !== 'MARKING_COMPLETE') {
      return res.status(400).json({
        success: false,
        message: 'Submission must be processed before marking',
      });
    }

    if (!submission.paper.markscheme) {
      return res.status(400).json({
        success: false,
        message: 'No markscheme available for this paper',
      });
    }

    const startTime = Date.now();
    const results = await markingEngine.markSubmission(submission.id);
    const processingTime = Date.now() - startTime;

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'MARKING_COMPLETE',
        processingTime: (submission.processingTime || 0) + processingTime,
      },
    });

    logger.info(`Marking completed for submission ${submission.id} by user ${req.user!.email} in ${processingTime}ms`);

    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        results,
        processingTime,
        totalScore: results.reduce((sum, r) => sum + r.marksAwarded, 0),
        maxScore: results.reduce((sum, r) => sum + r.maxMarks, 0),
      },
      message: 'Marking completed successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/submissions/:id/results', authenticate, async (req: AuthenticatedRequest, res, next) => {
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

    // Transform the data for the frontend
    const feedback = {
      submission: {
        id: submission.id,
        fileName: submission.fileName,
        status: submission.status,
        processingTime: submission.processingTime,
        createdAt: submission.createdAt,
      },
      paper: {
        id: submission.paper.id,
        code: submission.paper.code,
        title: submission.paper.title,
        subject: submission.paper.subject,
        level: submission.paper.level,
        year: submission.paper.year,
        session: submission.paper.session,
        examBoard: submission.paper.examBoard.name,
      },
      scores: submission.totalScore !== null ? {
        totalScore: submission.totalScore,
        maxScore: submission.maxScore || 23,
        percentage: submission.percentage || 0,
        grade: submission.grade || calculateGrade(submission.percentage || 0),
      } : null,
      questionResults: submission.results.map(result => ({
        questionId: result.questionId,
        studentAnswer: result.studentAnswer,
        marksAwarded: result.marksAwarded,
        maxMarks: result.maxMarks,
        isCorrect: result.isCorrect,
        feedback: result.feedback,
        confidence: result.confidence,
        markingPoints: result.markingPoints as any || [],
      })),
      summary: submission.results.length > 0 ? 
        generateSummary(submission.results, submission.percentage || 0) : {
        correctAnswers: 0,
        totalQuestions: 0,
        accuracyRate: 0,
        strengths: ["Submission processed successfully"],
        improvements: ["Results are being calculated"],
      },
    };

    logger.info(`Results retrieved for submission: ${req.params.id}`, {
      status: submission.status,
      totalScore: submission.totalScore,
      maxScore: submission.maxScore,
      questionCount: submission.results.length
    });

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authenticate, requireRole(['ADMIN', 'TEACHER']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const timeRange = req.query.range as string || '30d';
    const dateFrom = getDateFromRange(timeRange);

    const [
      totalSubmissions,
      completedSubmissions,
      averageScore,
      averageProcessingTime,
      topPerformers,
      questionStats,
    ] = await Promise.all([
      prisma.submission.count({
        where: { createdAt: { gte: dateFrom } },
      }),
      prisma.submission.count({
        where: {
          status: 'MARKING_COMPLETE',
          createdAt: { gte: dateFrom },
        },
      }),
      prisma.submission.aggregate({
        where: {
          status: 'MARKING_COMPLETE',
          createdAt: { gte: dateFrom },
        },
        _avg: { percentage: true },
      }),
      prisma.submission.aggregate({
        where: {
          status: 'MARKING_COMPLETE',
          createdAt: { gte: dateFrom },
        },
        _avg: { processingTime: true },
      }),
      prisma.submission.findMany({
        where: {
          status: 'MARKING_COMPLETE',
          createdAt: { gte: dateFrom },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { percentage: 'desc' },
        take: 10,
      }),
      getQuestionStatistics(dateFrom),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalSubmissions,
          completedSubmissions,
          averageScore: averageScore._avg.percentage || 0,
          averageProcessingTime: averageProcessingTime._avg.processingTime || 0,
          successRate: totalSubmissions > 0 ? (completedSubmissions / totalSubmissions) * 100 : 0,
        },
        topPerformers: topPerformers.map(submission => ({
          user: `${submission.user.firstName} ${submission.user.lastName}`,
          score: submission.percentage,
          submissionDate: submission.createdAt,
        })),
        questionStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

function calculateGrade(percentage: number): string {
  if (percentage >= 80) return 'A*';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  if (percentage >= 30) return 'E';
  return 'U';
}

function generateSummary(results: any[], percentage: number) {
  const correctAnswers = results.filter(r => r.isCorrect).length;
  const totalQuestions = results.length;
  
  const strengths = [];
  const improvements = [];

  if (percentage >= 80) {
    strengths.push('Excellent overall performance');
  } else if (percentage >= 60) {
    strengths.push('Good understanding of key concepts');
  }

  if (correctAnswers / totalQuestions >= 0.8) {
    strengths.push('Strong accuracy across most question types');
  }

  if (percentage < 60) {
    improvements.push('Review fundamental concepts and practice more questions');
  }

  const lowScoreQuestions = results.filter(r => (r.marksAwarded / r.maxMarks) < 0.5);
  if (lowScoreQuestions.length > 0) {
    improvements.push('Focus on calculation and equation-based questions');
  }

  return {
    correctAnswers,
    totalQuestions,
    accuracyRate: (correctAnswers / totalQuestions) * 100,
    strengths: strengths.length > 0 ? strengths : ['Attempt made on all questions'],
    improvements: improvements.length > 0 ? improvements : ['Continue practicing to maintain performance'],
  };
}

function getDateFromRange(range: string): Date {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

async function getQuestionStatistics(dateFrom: Date) {
  const questionResults = await prisma.markingResult.findMany({
    where: {
      createdAt: { gte: dateFrom },
    },
    select: {
      questionId: true,
      marksAwarded: true,
      maxMarks: true,
      isCorrect: true,
    },
  });

  const questionStats = questionResults.reduce((acc, result) => {
    if (!acc[result.questionId]) {
      acc[result.questionId] = {
        questionId: result.questionId,
        totalAttempts: 0,
        correctAttempts: 0,
        averageScore: 0,
        totalMarks: 0,
        maxMarks: result.maxMarks,
      };
    }

    acc[result.questionId].totalAttempts++;
    if (result.isCorrect) {
      acc[result.questionId].correctAttempts++;
    }
    acc[result.questionId].totalMarks += result.marksAwarded;

    return acc;
  }, {} as any);

  return Object.values(questionStats).map((stat: any) => ({
    ...stat,
    averageScore: stat.totalMarks / stat.totalAttempts,
    successRate: (stat.correctAttempts / stat.totalAttempts) * 100,
  }));
}

export default router;