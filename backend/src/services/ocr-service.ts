import { config } from '@/utils/config';
import { OCRResult } from '@/types';
import { logger } from '@/utils/logger';

export class OCRService {
  private readonly textApiUrl = 'https://api.mathpix.com/v3/text';
  private readonly pdfApiUrl = 'https://api.mathpix.com/v3/pdf';
  private readonly appId = config.mathpix.appId;
  private readonly appKey = config.mathpix.appKey;

  async processImage(imageData: Buffer, filename: string): Promise<OCRResult> {
    try {
      const base64Image = imageData.toString('base64');
      
      const requestBody = {
        src: `data:image/jpeg;base64,${base64Image}`,
        formats: ['text', 'latex_styled'],
        data_options: {
          include_asciimath: true,
          include_latex: true,
          include_svg: false,
          include_table_html: true,
          include_tsv: true
        },
        ocr: ['math', 'text']
      };

      const response = await fetch(this.textApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'app_id': this.appId,
          'app_key': this.appKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mathpix API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      logger.info(`OCR processed for ${filename}`, {
        confidence: result.confidence,
        textLength: result.text?.length || 0,
      });

      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        equations: this.extractEquations(result.latex_styled || ''),
        metadata: {
          pageCount: 1,
          processingTime: Date.now(),
        },
      };
    } catch (error) {
      logger.error('OCR processing failed', { error: error instanceof Error ? error.message : error, filename });
      throw new Error('Failed to process image with OCR');
    }
  }

  async processPDF(pdfBuffer: Buffer, filename: string): Promise<OCRResult> {
    try {
      // Check file size (MathPix PDF API supports up to 1GB)
      if (pdfBuffer.length > 100 * 1024 * 1024) { // 100MB limit for safety
        logger.warn(`PDF too large for MathPix: ${pdfBuffer.length} bytes`);
        throw new Error('PDF file is too large for OCR processing');
      }

      logger.info(`Processing PDF ${filename}: size=${pdfBuffer.length} bytes`);
      
      // Step 1: Upload PDF to MathPix PDF API
      const formData = new FormData();
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', blob, filename);
      
      const options = {
        conversion_formats: {
          'md': true,
          'html': false,
          'docx': false,
          'tex.zip': false,
          'pdf': false,
          'latex.pdf': false,
          'pptx': false
        },
        math_inline_delimiters: ['$', '$'],
        rm_spaces: true
      };
      
      formData.append('options_json', JSON.stringify(options));

      const uploadResponse = await fetch(this.pdfApiUrl, {
        method: 'POST',
        headers: {
          'app_id': this.appId,
          'app_key': this.appKey,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        logger.error(`Mathpix PDF upload error for ${filename}:`, {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText
        });
        throw new Error(`Mathpix PDF upload error: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      const pdfId = uploadResult.pdf_id;
      
      logger.info(`MathPix upload response:`, {
        pdfId: pdfId,
        fullResponse: uploadResult
      });
      
      if (!pdfId) {
        throw new Error(`No PDF ID returned from MathPix. Response: ${JSON.stringify(uploadResult)}`);
      }

      // Step 2: Poll for processing completion
      let processedResult = null;
      const maxAttempts = 30; // 5 minutes with 10-second intervals
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        const statusResponse = await fetch(`${this.pdfApiUrl}/${pdfId}`, {
          method: 'GET',
          headers: {
            'app_id': this.appId,
            'app_key': this.appKey,
          },
        });

        if (!statusResponse.ok) {
          logger.error(`Failed to check PDF processing status: ${statusResponse.status}`);
          attempts++;
          continue;
        }

        const statusResult = await statusResponse.json();
        
        logger.info(`PDF status response:`, {
          status: statusResult.status,
          fullResponse: statusResult,
          attempt: attempts + 1
        });
        
        if (statusResult.status === 'completed') {
          processedResult = statusResult;
          break;
        } else if (statusResult.status === 'error') {
          throw new Error(`PDF processing failed: ${statusResult.error || 'Unknown error'}`);
        }
        attempts++;
      }

      if (!processedResult) {
        throw new Error('PDF processing timeout');
      }

      // Step 3: Download the converted content
      let extractedText = '';
      
      try {
        // Download markdown content using the pdf_id
        const contentResponse = await fetch(`${this.pdfApiUrl}/${pdfId}.md`, {
          method: 'GET',
          headers: {
            'app_id': this.appId,
            'app_key': this.appKey,
          },
        });

        if (contentResponse.ok) {
          extractedText = await contentResponse.text();
          logger.info(`Downloaded markdown content: ${extractedText.length} characters`);
        } else {
          logger.warn(`Failed to download markdown content: ${contentResponse.status}`);
          
          // Fallback: try to get Mathpix Markdown format
          const mmdResponse = await fetch(`${this.pdfApiUrl}/${pdfId}.mmd`, {
            method: 'GET',
            headers: {
              'app_id': this.appId,
              'app_key': this.appKey,
            },
          });
          
          if (mmdResponse.ok) {
            extractedText = await mmdResponse.text();
            logger.info(`Downloaded MMD content: ${extractedText.length} characters`);
          } else {
            logger.error(`Failed to download any content format`);
            extractedText = '';
          }
        }
      } catch (error) {
        logger.error(`Error downloading converted content:`, error);
        extractedText = '';
      }

      logger.info(`PDF processing completed for ${filename}:`, {
        textLength: extractedText.length,
        status: processedResult.status
      });

      return {
        text: extractedText,
        confidence: 1.0, // PDF processing is generally reliable
        equations: this.extractEquations(extractedText),
        metadata: {
          pageCount: processedResult.page_count || 1,
          processingTime: Date.now(),
          pdfId: pdfId,
        },
      };
    } catch (error) {
      logger.error('PDF OCR processing failed', { error: error instanceof Error ? error.message : error, filename });
      throw new Error('Failed to process PDF with OCR');
    }
  }

  private extractEquations(latexContent: string): string[] {
    const equations: string[] = [];
    
    const mathBlockRegex = /\$\$(.*?)\$\$/g;
    let match;
    
    while ((match = mathBlockRegex.exec(latexContent)) !== null) {
      equations.push(match[1].trim());
    }
    
    const inlineMathRegex = /\$(.*?)\$/g;
    while ((match = inlineMathRegex.exec(latexContent)) !== null) {
      if (!equations.includes(match[1].trim())) {
        equations.push(match[1].trim());
      }
    }
    
    return equations;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const testRequestBody = {
        src: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AJAA+AD/2Q==',
        formats: ['text'],
        data_options: {
          include_asciimath: false,
          include_latex: false,
        }
      };

      const response = await fetch(this.textApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'app_id': this.appId,
          'app_key': this.appKey,
        },
        body: JSON.stringify(testRequestBody),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}