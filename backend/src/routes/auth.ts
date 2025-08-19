import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { generateToken } from '@/utils/jwt';
import { ValidationError, UnauthorizedError } from '@/middleware/error-handler';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';
import { LoginRequest, RegisterRequest, AuthResponse, AuthUser } from '@/types';
import { logger } from '@/utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body) as LoginRequest;
    
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
    };

    const response: AuthResponse = {
      user: authUser,
      token,
      expiresAt: expiresAt.toISOString(),
    };

    logger.info(`User logged in: ${user.email}`);
    
    res.json({
      success: true,
      data: response,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body) as RegisterRequest;
    
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: 'STUDENT',
        isVerified: false,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isVerified: user.isVerified,
    };

    const response: AuthResponse = {
      user: authUser,
      token,
      expiresAt: expiresAt.toISOString(),
    };

    logger.info(`User registered: ${user.email}`);
    
    res.status(201).json({
      success: true,
      data: response,
      message: 'Registration successful',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    
    if (token) {
      await prisma.userSession.deleteMany({
        where: { token },
      });
    }

    logger.info(`User logged out: ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const oldToken = authHeader?.substring(7);
    
    if (!oldToken || !req.user) {
      throw new UnauthorizedError('Invalid token');
    }

    await prisma.userSession.deleteMany({
      where: { token: oldToken },
    });

    const newToken = generateToken({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        userId: req.user.id,
        token: newToken,
        expiresAt,
      },
    });

    const response: AuthResponse = {
      user: req.user,
      token: newToken,
      expiresAt: expiresAt.toISOString(),
    };

    res.json({
      success: true,
      data: response,
      message: 'Token refreshed',
    });
  } catch (error) {
    next(error);
  }
});

export default router;