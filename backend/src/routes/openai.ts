import { Router, Request, Response } from 'express';
import { OpenAIMarkingService, MarkingRequest } from '@/services/openaiService';
import { logger } from '@/utils/logger';

const router = Router();
const openaiService = new OpenAIMarkingService();

router.post('/test-marking', async (req: Request, res: Response) => {
  try {
    const { question, markScheme, studentAnswer, totalMarks }: MarkingRequest = req.body;

    if (!question || !markScheme || !studentAnswer || !totalMarks) {
      return res.status(400).json({
        error: 'Missing required fields: question, markScheme, studentAnswer, totalMarks'
      });
    }

    const result = await openaiService.markAnswer({
      question,
      markScheme,
      studentAnswer,
      totalMarks
    });

    logger.info(`OpenAI marking completed: ${result.score}/${result.maxScore}`);

    res.json({
      success: true,
      result
    });

  } catch (error: any) {
    logger.error('OpenAI marking test failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to mark with OpenAI'
    });
  }
});

router.get('/validate-connection', async (req: Request, res: Response) => {
  try {
    const isValid = await openaiService.validateConnection();
    
    res.json({
      success: true,
      connected: isValid,
      message: isValid ? 'OpenAI connection successful' : 'OpenAI connection failed'
    });

  } catch (error: any) {
    logger.error('OpenAI connection validation failed:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

export default router;