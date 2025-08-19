import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3001),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  }),
  database: z.object({
    url: z.string().min(1),
  }),
  jwt: z.object({
    secret: z.string().min(8),
    expiresIn: z.string().default('7d'),
  }),
  frontend: z.object({
    url: z.string().url().default('http://localhost:5173'),
  }),
  redis: z.object({
    url: z.string().url().default('redis://localhost:6379'),
  }),
  mathpix: z.object({
    appId: z.string().default('demo-app-id'),
    appKey: z.string().default('demo-app-key'),
  }),
  upload: z.object({
    dir: z.string().default('uploads'),
    maxFileSize: z.number().default(52428800),
    allowedExtensions: z.array(z.string()).default(['.pdf']),
  }),
  email: z.object({
    sendgridApiKey: z.string().default('dummy-key'),
    fromEmail: z.string().default('noreply@example.com'),
  }),
  aws: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    region: z.string().default('us-east-1'),
    s3Bucket: z.string().optional(),
  }),
  openai: z.object({
    apiKey: z.string().min(1),
  }),
});

function loadConfig() {
  const rawConfig = {
    server: {
      port: parseInt(process.env.PORT || '3001', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    database: {
      url: process.env.DATABASE_URL || '',
    },
    jwt: {
      secret: process.env.JWT_SECRET || '',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    frontend: {
      url: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    mathpix: {
      appId: process.env.MATHPIX_APP_ID || '',
      appKey: process.env.MATHPIX_APP_KEY || '',
    },
    upload: {
      dir: process.env.UPLOAD_DIR || 'uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
      allowedExtensions: (process.env.ALLOWED_EXTENSIONS || '.pdf').split(','),
    },
    email: {
      sendgridApiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.FROM_EMAIL || '',
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      s3Bucket: process.env.AWS_S3_BUCKET,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;