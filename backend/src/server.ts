import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import rateLimit from 'express-rate-limit'; // Disabled for development
import { config } from '@/utils/config';
import { errorHandler } from '@/middleware/error-handler';
import { logger } from '@/utils/logger';
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import paperRoutes from '@/routes/papers';
import markschemeRoutes from '@/routes/markschemes';
import submissionRoutes from '@/routes/submissions';
import markingRoutes from '@/routes/marking';
import openaiRoutes from '@/routes/openai';
import markschemeUploadRoutes from '@/routes/markschemes-upload';
import adminRoutes from '@/routes/admin';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
}));

// Rate limiting completely disabled for development
// if (!config.isDevelopment) {
//   const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100,
//     message: 'Too many requests from this IP, please try again later.',
//   });
//   app.use(limiter);
// }

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/markschemes', markschemeRoutes);
app.use('/api/markschemes', markschemeUploadRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/marking', markingRoutes);
app.use('/api/openai', openaiRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'AQA Chemistry Marking System API',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      papers: '/api/papers/*',
      markschemes: '/api/markschemes/*',
      submissions: '/api/submissions/*',
      marking: '/api/marking/*',
      openai: '/api/openai/*',
      admin: '/api/admin/*'
    },
    frontend: 'http://localhost:5173'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.use(errorHandler);

const server = app.listen(config.server.port, () => {
  logger.info(`Server running on port ${config.server.port}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;