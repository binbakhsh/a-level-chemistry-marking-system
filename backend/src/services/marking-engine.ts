import { PrismaClient } from '@prisma/client';
import { ChemistryUtils } from '@/services/chemistry-utils';
import { MarkingResultData, Question, MarkschemeContent, ExtractedAnswer } from '@/types';
import { logger } from '@/utils/logger';
import { OpenAIMarkingService, MarkingRequest } from '@/services/openaiService';

const prisma = new PrismaClient();

export class MarkingEngine {
  private openaiService: OpenAIMarkingService;

  constructor() {
    this.openaiService = new OpenAIMarkingService();
  }
  async markSubmission(submissionId: string): Promise<MarkingResultData[]> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        paper: {
          include: {
            markscheme: true,
          },
        },
      },
    });

    if (!submission || !submission.paper.markscheme) {
      throw new Error('Submission or markscheme not found');
    }

    const markscheme = submission.paper.markscheme.content as MarkschemeContent;
    const extractedAnswers = this.extractAnswersFromOCR(submission.ocrText || '');
    
    const results: MarkingResultData[] = [];

    for (const question of markscheme.questions) {
      const studentAnswer = extractedAnswers.find(a => a.questionId === question.id);
      const result = await this.markQuestion(question, studentAnswer?.answer || '', markscheme);
      results.push(result);

      await prisma.markingResult.create({
        data: {
          submissionId,
          questionId: question.id,
          studentAnswer: studentAnswer?.answer || '',
          marksAwarded: result.marksAwarded,
          maxMarks: result.maxMarks,
          feedback: result.feedback,
          markingPoints: result.markingPoints as any,
          isCorrect: result.isCorrect,
          confidence: result.confidence,
        },
      });
    }

    const totalScore = results.reduce((sum, r) => sum + r.marksAwarded, 0);
    const maxScore = results.reduce((sum, r) => sum + r.maxMarks, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: totalScore,
        maxScore,
        percentage,
        feedback: {
          totalScore,
          maxScore,
          percentage,
          questionResults: results,
        } as any,
      },
    });

    logger.info(`Marking completed for submission ${submissionId}: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%)`);

    return results;
  }

  private async markQuestion(
    question: Question,
    studentAnswer: string,
    markscheme: MarkschemeContent
  ): Promise<MarkingResultData> {
    const cleanAnswer = studentAnswer.trim();
    
    if (!cleanAnswer) {
      return {
        questionId: question.id,
        studentAnswer: cleanAnswer,
        marksAwarded: 0,
        maxMarks: question.maxMarks,
        feedback: 'No answer provided',
        markingPoints: question.markingPoints.map(mp => ({
          id: mp.id,
          awarded: false,
          reason: 'No answer provided',
        })),
        isCorrect: false,
        confidence: 1.0,
      };
    }

    if (process.env.USE_OPENAI_MARKING === 'true') {
      return this.markWithOpenAI(question, cleanAnswer, markscheme);
    }

    switch (question.type) {
      case 'multiple_choice':
        return this.markMultipleChoice(question, cleanAnswer);
      
      case 'calculation':
        return this.markCalculation(question, cleanAnswer, markscheme);
      
      case 'chemical_equation':
        return this.markChemicalEquation(question, cleanAnswer, markscheme);
      
      case 'short_answer':
        return this.markShortAnswer(question, cleanAnswer, markscheme);
      
      case 'extended_response':
        return this.markExtendedResponse(question, cleanAnswer, markscheme);
      
      default:
        return this.markGeneric(question, cleanAnswer);
    }
  }

  private markMultipleChoice(question: Question, studentAnswer: string): MarkingResultData {
    const cleanStudentAnswer = studentAnswer.toUpperCase().trim();
    const correctAnswer = question.correctAnswer?.toUpperCase();
    const isCorrect = correctAnswer === cleanStudentAnswer;

    return {
      questionId: question.id,
      studentAnswer,
      marksAwarded: isCorrect ? question.maxMarks : 0,
      maxMarks: question.maxMarks,
      feedback: isCorrect ? 'Correct answer' : `Incorrect. The correct answer is ${correctAnswer}`,
      markingPoints: [{
        id: 'MC1',
        awarded: isCorrect,
        reason: isCorrect ? 'Correct multiple choice answer' : 'Incorrect answer',
      }],
      isCorrect,
      confidence: 1.0,
    };
  }

  private markCalculation(question: Question, studentAnswer: string, markscheme: MarkschemeContent): MarkingResultData {
    const numericValue = ChemistryUtils.extractNumericValue(studentAnswer);
    let marksAwarded = 0;
    const markingPoints = question.markingPoints.map(mp => ({
      id: mp.id,
      awarded: false,
      reason: '',
    }));

    if (question.acceptedAnswers && numericValue !== null) {
      for (const acceptedAnswer of question.acceptedAnswers) {
        const acceptedValue = ChemistryUtils.extractNumericValue(acceptedAnswer);
        if (acceptedValue !== null && Math.abs(numericValue - acceptedValue) < 0.01) {
          marksAwarded = question.maxMarks;
          markingPoints.forEach(mp => {
            mp.awarded = true;
            mp.reason = 'Correct calculation and answer';
          });
          break;
        }
      }
    }

    if (marksAwarded === 0) {
      if (this.hasWorkingShown(studentAnswer)) {
        const partialMarks = Math.floor(question.maxMarks * 0.5);
        marksAwarded = partialMarks;
        if (markingPoints[0]) {
          markingPoints[0].awarded = true;
          markingPoints[0].reason = 'Correct method shown';
        }
      }
    }

    const isCorrect = marksAwarded === question.maxMarks;
    
    return {
      questionId: question.id,
      studentAnswer,
      marksAwarded,
      maxMarks: question.maxMarks,
      feedback: this.generateCalculationFeedback(isCorrect, marksAwarded, question.maxMarks),
      markingPoints,
      isCorrect,
      confidence: 0.8,
    };
  }

  private markChemicalEquation(question: Question, studentAnswer: string, markscheme: MarkschemeContent): MarkingResultData {
    let marksAwarded = 0;
    const markingPoints = question.markingPoints.map(mp => ({
      id: mp.id,
      awarded: false,
      reason: '',
    }));

    const parsedEquation = ChemistryUtils.parseEquation(studentAnswer);
    const correctEquation = question.correctEquation;

    if (correctEquation && ChemistryUtils.compareEquations(studentAnswer, correctEquation)) {
      marksAwarded = question.maxMarks;
      markingPoints.forEach(mp => {
        mp.awarded = true;
        mp.reason = 'Correct chemical equation';
      });
    } else if (parsedEquation) {
      if (markingPoints[0] && this.hasCorrectFormulas(studentAnswer, correctEquation || '')) {
        markingPoints[0].awarded = true;
        markingPoints[0].reason = 'Correct chemical formulas';
        marksAwarded += 1;
      }

      if (markingPoints[1] && question.balanceRequired && parsedEquation.isBalanced) {
        markingPoints[1].awarded = true;
        markingPoints[1].reason = 'Equation is balanced';
        marksAwarded += 1;
      }

      if (markingPoints[2] && question.stateSymbolsRequired && this.hasStateSymbols(studentAnswer)) {
        markingPoints[2].awarded = true;
        markingPoints[2].reason = 'State symbols included';
        marksAwarded += 1;
      }
    }

    const isCorrect = marksAwarded === question.maxMarks;

    return {
      questionId: question.id,
      studentAnswer,
      marksAwarded,
      maxMarks: question.maxMarks,
      feedback: this.generateEquationFeedback(isCorrect, parsedEquation, question),
      markingPoints,
      isCorrect,
      confidence: 0.85,
    };
  }

  private markShortAnswer(question: Question, studentAnswer: string, markscheme: MarkschemeContent): MarkingResultData {
    let marksAwarded = 0;
    const markingPoints = question.markingPoints.map(mp => ({
      id: mp.id,
      awarded: false,
      reason: '',
    }));

    if (question.acceptedAnswers) {
      for (const acceptedAnswer of question.acceptedAnswers) {
        const tolerance = markscheme.markingRules.spellingTolerance === 'strict' ? 0.95 : 0.8;
        
        if (ChemistryUtils.fuzzyCompareText(studentAnswer, acceptedAnswer, tolerance)) {
          marksAwarded = question.maxMarks;
          markingPoints.forEach(mp => {
            mp.awarded = true;
            mp.reason = 'Answer matches expected response';
          });
          break;
        }
      }
    }

    if (marksAwarded === 0 && question.markingPoints.length > 0) {
      for (const mp of question.markingPoints) {
        if (mp.keywords) {
          const foundKeywords = mp.keywords.some(keyword => 
            studentAnswer.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (foundKeywords) {
            const pointIndex = markingPoints.findIndex(p => p.id === mp.id);
            if (pointIndex >= 0) {
              markingPoints[pointIndex].awarded = true;
              markingPoints[pointIndex].reason = 'Contains required keywords';
              marksAwarded += mp.marks;
            }
          }
        }
      }
    }

    const isCorrect = marksAwarded === question.maxMarks;

    return {
      questionId: question.id,
      studentAnswer,
      marksAwarded,
      maxMarks: question.maxMarks,
      feedback: this.generateShortAnswerFeedback(isCorrect, studentAnswer, question),
      markingPoints,
      isCorrect,
      confidence: 0.75,
    };
  }

  private markExtendedResponse(question: Question, studentAnswer: string, markscheme: MarkschemeContent): MarkingResultData {
    let marksAwarded = 0;
    const markingPoints = question.markingPoints.map(mp => ({
      id: mp.id,
      awarded: false,
      reason: '',
    }));

    for (const mp of question.markingPoints) {
      if (mp.keywords) {
        const keywordCount = mp.keywords.filter(keyword =>
          studentAnswer.toLowerCase().includes(keyword.toLowerCase())
        ).length;

        const threshold = Math.ceil(mp.keywords.length * 0.6);
        
        if (keywordCount >= threshold) {
          const pointIndex = markingPoints.findIndex(p => p.id === mp.id);
          if (pointIndex >= 0) {
            markingPoints[pointIndex].awarded = true;
            markingPoints[pointIndex].reason = `Found ${keywordCount}/${mp.keywords.length} key concepts`;
            marksAwarded += mp.marks;
          }
        }
      }
    }

    const isCorrect = marksAwarded >= question.maxMarks * 0.8;

    return {
      questionId: question.id,
      studentAnswer,
      marksAwarded,
      maxMarks: question.maxMarks,
      feedback: this.generateExtendedResponseFeedback(marksAwarded, question.maxMarks),
      markingPoints,
      isCorrect,
      confidence: 0.65,
    };
  }

  private markGeneric(question: Question, studentAnswer: string): MarkingResultData {
    return {
      questionId: question.id,
      studentAnswer,
      marksAwarded: 0,
      maxMarks: question.maxMarks,
      feedback: 'Unable to automatically mark this question type',
      markingPoints: question.markingPoints.map(mp => ({
        id: mp.id,
        awarded: false,
        reason: 'Manual marking required',
      })),
      isCorrect: false,
      confidence: 0.0,
    };
  }

  private extractAnswersFromOCR(ocrText: string): ExtractedAnswer[] {
    const answers: ExtractedAnswer[] = [];
    const lines = ocrText.split('\n');
    
    let currentQuestionId = '';
    let answerLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const questionMatch = line.match(/(\d{2}\.\d+)/);
      if (questionMatch) {
        if (currentQuestionId && answerLines.length > 0) {
          answers.push({
            questionId: currentQuestionId,
            answer: answerLines.join(' ').trim(),
            confidence: 0.8,
            position: { page: 1 },
          });
        }
        
        currentQuestionId = questionMatch[1];
        answerLines = [];
      } else if (currentQuestionId && line.length > 0) {
        answerLines.push(line);
      }
    }
    
    if (currentQuestionId && answerLines.length > 0) {
      answers.push({
        questionId: currentQuestionId,
        answer: answerLines.join(' ').trim(),
        confidence: 0.8,
        position: { page: 1 },
      });
    }
    
    return answers;
  }

  private hasWorkingShown(answer: string): boolean {
    const workingIndicators = ['=', '×', '÷', '+', '-', 'x', '/', '*'];
    return workingIndicators.some(indicator => answer.includes(indicator));
  }

  private hasCorrectFormulas(studentEquation: string, correctEquation: string): boolean {
    const studentFormulas = this.extractFormulas(studentEquation);
    const correctFormulas = this.extractFormulas(correctEquation);
    
    return studentFormulas.length === correctFormulas.length &&
           studentFormulas.every(formula => 
             correctFormulas.some(correct => ChemistryUtils.compareFormulas(formula, correct))
           );
  }

  private hasStateSymbols(equation: string): boolean {
    return /\([gas|liquid|solid|aqueous|g|l|s|aq]\)/i.test(equation);
  }

  private extractFormulas(equation: string): string[] {
    const formulas: string[] = [];
    const parts = equation.split(/[→=+]/);
    
    for (const part of parts) {
      const formula = part.replace(/^\d+\s*/, '').replace(/\([^)]*\)$/, '').trim();
      if (formula) {
        formulas.push(formula);
      }
    }
    
    return formulas;
  }

  private generateCalculationFeedback(isCorrect: boolean, marksAwarded: number, maxMarks: number): string {
    if (isCorrect) {
      return 'Correct calculation and final answer';
    } else if (marksAwarded > 0) {
      return 'Partial credit for correct method, but check your final answer';
    } else {
      return 'Incorrect answer. Check your calculation method and units';
    }
  }

  private generateEquationFeedback(isCorrect: boolean, parsedEquation: any, question: Question): string {
    if (isCorrect) {
      return 'Correct chemical equation';
    } else if (parsedEquation) {
      const issues = [];
      if (question.balanceRequired && !parsedEquation.isBalanced) {
        issues.push('equation is not balanced');
      }
      if (question.stateSymbolsRequired && !this.hasStateSymbols(question.correctEquation || '')) {
        issues.push('missing state symbols');
      }
      return `Partially correct, but ${issues.join(' and ')}`;
    } else {
      return 'Invalid chemical equation format';
    }
  }

  private generateShortAnswerFeedback(isCorrect: boolean, studentAnswer: string, question: Question): string {
    if (isCorrect) {
      return 'Correct answer';
    } else {
      return 'Incorrect or incomplete answer. Review the key concepts for this question';
    }
  }

  private generateExtendedResponseFeedback(marksAwarded: number, maxMarks: number): string {
    const percentage = (marksAwarded / maxMarks) * 100;
    
    if (percentage >= 80) {
      return 'Good response covering most key points';
    } else if (percentage >= 60) {
      return 'Adequate response but missing some important details';
    } else if (percentage >= 40) {
      return 'Basic response with some correct points, but needs more detail';
    } else {
      return 'Response lacks key concepts and detail required for this question';
    }
  }

  private async markWithOpenAI(
    question: Question,
    studentAnswer: string,
    markscheme: MarkschemeContent
  ): Promise<MarkingResultData> {
    try {
      const markingRequest: MarkingRequest = {
        question: question.text || `Question ${question.id}`,
        markScheme: this.formatMarkSchemeForOpenAI(question, markscheme),
        studentAnswer,
        totalMarks: question.maxMarks,
      };

      const result = await this.openaiService.markAnswer(markingRequest);
      
      return {
        questionId: question.id,
        studentAnswer,
        marksAwarded: result.score,
        maxMarks: result.maxScore,
        feedback: result.feedback,
        markingPoints: result.breakdown.map((point, index) => ({
          id: `AI_${index + 1}`,
          awarded: point.awarded,
          reason: point.reason,
        })),
        isCorrect: result.score === result.maxScore,
        confidence: 0.9,
      };
    } catch (error) {
      logger.error(`OpenAI marking failed for question ${question.id}:`, error);
      
      return {
        questionId: question.id,
        studentAnswer,
        marksAwarded: 0,
        maxMarks: question.maxMarks,
        feedback: 'Unable to mark using AI - please review manually',
        markingPoints: question.markingPoints.map(mp => ({
          id: mp.id,
          awarded: false,
          reason: 'AI marking failed',
        })),
        isCorrect: false,
        confidence: 0.0,
      };
    }
  }

  private formatMarkSchemeForOpenAI(question: Question, markscheme: MarkschemeContent): string {
    let formatted = `Question Type: ${question.type}\n`;
    formatted += `Maximum Marks: ${question.maxMarks}\n\n`;
    
    if (question.acceptedAnswers && question.acceptedAnswers.length > 0) {
      formatted += `Accepted Answers:\n`;
      question.acceptedAnswers.forEach((answer, index) => {
        formatted += `${index + 1}. ${answer}\n`;
      });
      formatted += '\n';
    }

    if (question.markingPoints && question.markingPoints.length > 0) {
      formatted += `Marking Points:\n`;
      question.markingPoints.forEach((mp, index) => {
        formatted += `${mp.id} (${mp.marks} mark${mp.marks > 1 ? 's' : ''}): ${mp.description}\n`;
        if (mp.keywords && mp.keywords.length > 0) {
          formatted += `  Keywords: ${mp.keywords.join(', ')}\n`;
        }
      });
      formatted += '\n';
    }

    if (markscheme.markingRules) {
      formatted += `Marking Rules:\n`;
      formatted += `- Spelling Tolerance: ${markscheme.markingRules.spellingTolerance}\n`;
      formatted += `- List Penalty: ${markscheme.markingRules.listPenalty ? 'Apply' : 'Do not apply'}\n`;
      formatted += `- ECF (Error Carried Forward): ${markscheme.markingRules.allowECF ? 'Allowed' : 'Not allowed'}\n`;
    }

    return formatted;
  }
}