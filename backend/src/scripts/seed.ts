import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seed...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create multiple exam boards
  const aqaBoard = await prisma.examBoard.upsert({
    where: { code: 'AQA' },
    update: {},
    create: {
      name: 'Assessment and Qualifications Alliance',
      code: 'AQA',
      description: 'AQA is an independent charity and the largest provider of academic qualifications taught in schools and colleges across England.',
      isActive: true,
    },
  });

  const edexcelBoard = await prisma.examBoard.upsert({
    where: { code: 'EDEXCEL' },
    update: {},
    create: {
      name: 'Pearson Edexcel',
      code: 'EDEXCEL',
      description: 'Pearson Edexcel is a leading provider of academic and vocational qualifications in the UK and internationally.',
      isActive: true,
    },
  });

  const ocrBoard = await prisma.examBoard.upsert({
    where: { code: 'OCR' },
    update: {},
    create: {
      name: 'Oxford Cambridge and RSA Examinations',
      code: 'OCR',
      description: 'OCR is one of the UK\'s leading awarding bodies, providing qualifications for learners of all ages.',
      isActive: true,
    },
  });

  const examBoard = aqaBoard; // Keep existing variable for compatibility

  const paper = await prisma.paper.upsert({
    where: {
      examBoardId_code_year_session: {
        examBoardId: examBoard.id,
        code: '7405/1',
        year: 2024,
        session: 'June',
      },
    },
    update: {},
    create: {
      examBoardId: examBoard.id,
      code: '7405/1',
      title: 'A-level Chemistry Paper 1: Inorganic and Physical Chemistry',
      subject: 'Chemistry',
      level: 'A-level',
      year: 2024,
      session: 'June',
      duration: 105,
      totalMarks: 105,
      isActive: true,
    },
  });

  const sampleMarkscheme = {
    version: '1.0',
    questions: [
      {
        id: '01.1',
        maxMarks: 1,
        type: 'multiple_choice',
        correctAnswer: 'C',
        alternatives: ['C'],
        explanation: 'The correct answer is C as it represents the electron configuration for sodium.',
      },
      {
        id: '01.2',
        maxMarks: 2,
        type: 'calculation',
        acceptedAnswers: ['24.3', '24.30', '24.3 g/mol'],
        markingPoints: [
          {
            id: 'M1',
            marks: 1,
            criteria: 'Correct molar mass calculation setup',
            keywords: ['molar mass', 'molecular weight'],
          },
          {
            id: 'M2',
            marks: 1,
            criteria: 'Correct final answer with appropriate units',
            keywords: ['24.3', 'g/mol'],
          },
        ],
        allowedVariations: ['24.30', '24.3000'],
        commonErrors: [
          {
            error: '24',
            feedback: 'Remember to include appropriate significant figures',
          },
        ],
      },
      {
        id: '02.1',
        maxMarks: 3,
        type: 'chemical_equation',
        correctEquation: 'CaCO3 + 2HCl → CaCl2 + H2O + CO2',
        markingPoints: [
          {
            id: 'M1',
            marks: 1,
            criteria: 'Correct chemical formulas for reactants and products',
          },
          {
            id: 'M2',
            marks: 1,
            criteria: 'Correct balancing of the equation',
          },
          {
            id: 'M3',
            marks: 1,
            criteria: 'State symbols if required',
          },
        ],
        balanceRequired: true,
        stateSymbolsRequired: false,
      },
    ],
    markingRules: {
      listPenalty: true,
      consequentialMarking: true,
      spellingTolerance: 'moderate',
      chemicalFormulaTolerance: 'strict',
    },
  };

  await prisma.markscheme.upsert({
    where: { paperId: paper.id },
    update: { content: sampleMarkscheme },
    create: {
      paperId: paper.id,
      version: '1.0',
      content: sampleMarkscheme,
      totalMarks: 105,
      questionCount: 3,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Student',
      role: 'STUDENT',
      isVerified: true,
    },
  });

  logger.info('Database seed completed successfully');
}

main()
  .catch((e) => {
    logger.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });