# Requirements Document: AQA Chemistry Marking System

## Project Overview

### Vision
Create an automated marking system for A-Level Chemistry papers, starting with AQA examination board, that provides accurate marking and detailed feedback to students.

### Target Users
- **Primary**: A-Level Chemistry students (16-18 years old)
- **Secondary**: Teachers and tutors
- **Geographic**: Global, with focus on UK curriculum

## Functional Requirements

### 1. User Management
- **UR-001**: User registration and authentication
- **UR-002**: Profile management with examination board preference
- **UR-003**: Progress tracking and submission history
- **UR-004**: Password reset functionality

### 2. Examination Board Management
- **EB-001**: Support for AQA examination board (Phase 1)
- **EB-002**: Paper selection by year and paper code (e.g., 7405/1 June 2024)
- **EB-003**: Markscheme upload and management system
- **EB-004**: Question type categorization (MCQ, calculations, explanations, diagrams)
- **EB-005**: Future expansion capability for other boards (Edexcel, Cambridge, etc.)

### 3. File Upload and Processing
- **FU-001**: PDF upload for student answer sheets (max 50MB)
- **FU-002**: OCR processing for typed answers
- **FU-003**: Question-answer segmentation and extraction
- **FU-004**: File format validation and error handling
- **FU-005**: Progress indicators for file processing

### 4. Marking Engine
- **ME-001**: Automated marking based on AQA markschemes
- **ME-002**: Multiple choice question evaluation
- **ME-003**: Chemical equation validation and scoring
- **ME-004**: Fuzzy matching for chemical formulas and terminology
- **ME-005**: Phonetic spelling acceptance
- **ME-006**: List penalty implementation ("right + wrong = wrong")
- **ME-007**: Consequential marking (ECF) support
- **ME-008**: Partial credit allocation
- **ME-009**: Extended response evaluation

### 5. Chemistry-Specific Features
- **CF-001**: Chemical equation balancing verification
- **CF-002**: IUPAC nomenclature validation
- **CF-003**: Organic structure recognition (future enhancement)
- **CF-004**: Unit validation and conversion
- **CF-005**: State symbol handling (optional/required)
- **CF-006**: Scientific notation processing

### 6. Feedback System
- **FS-001**: Question-by-question mark breakdown
- **FS-002**: Detailed feedback for each marking point
- **FS-003**: Identification of strengths and weaknesses
- **FS-004**: Improvement suggestions
- **FS-005**: Overall performance summary
- **FS-006**: Comparison with grade boundaries
- **FS-007**: Progress tracking over time

### 7. Administrative Features
- **AF-001**: Markscheme upload and management
- **AF-002**: Question bank management
- **AF-003**: System analytics and reporting
- **AF-004**: User activity monitoring
- **AF-005**: Error logging and debugging tools

## Non-Functional Requirements

### 1. Performance
- **NF-001**: PDF processing within 30 seconds for typical papers
- **NF-002**: Marking completion within 60 seconds
- **NF-003**: Support for 100 concurrent users
- **NF-004**: 99.9% uptime availability
- **NF-005**: Response time under 3 seconds for UI interactions

### 2. Accuracy
- **NF-006**: 95%+ marking accuracy compared to human markers
- **NF-007**: Chemical formula recognition accuracy 98%+
- **NF-008**: OCR text extraction accuracy 99%+ for typed content
- **NF-009**: Question segmentation accuracy 98%+

### 3. Scalability
- **NF-010**: Architecture supports addition of new examination boards
- **NF-011**: Database design supports 10,000+ papers per board
- **NF-012**: Horizontal scaling capability
- **NF-013**: Efficient caching for frequently accessed markschemes

### 4. Security
- **NF-014**: HTTPS encryption for all data transmission
- **NF-015**: Secure file upload with virus scanning
- **NF-016**: User data privacy compliance (GDPR)
- **NF-017**: Secure API authentication
- **NF-018**: Regular security audits and updates

### 5. Usability
- **NF-019**: Intuitive interface for 16-18 year olds
- **NF-020**: Mobile-responsive design
- **NF-021**: Accessibility compliance (WCAG 2.1)
- **NF-022**: Multi-language support (future)
- **NF-023**: Offline capability for results viewing

### 6. Compatibility
- **NF-024**: Support for modern browsers (Chrome, Firefox, Safari, Edge)
- **NF-025**: PDF format compatibility (Adobe PDF 1.4+)
- **NF-026**: Mobile device compatibility (iOS, Android)
- **NF-027**: Integration capability with LMS platforms

## Technical Constraints

### 1. Integration Requirements
- **TC-001**: Mathpix OCR API integration for scientific content
- **TC-002**: PostgreSQL database for data persistence
- **TC-003**: AWS S3 or equivalent for file storage
- **TC-004**: Email service integration for notifications
- **TC-005**: Payment processing integration (future)

### 2. Data Requirements
- **TC-006**: Structured storage for markschemes (JSON format)
- **TC-007**: Student submission tracking and history
- **TC-008**: Analytics data collection and storage
- **TC-009**: Audit trail for all marking decisions
- **TC-010**: Backup and disaster recovery procedures

### 3. Development Constraints
- **TC-011**: React.js frontend framework
- **TC-012**: Node.js backend implementation
- **TC-013**: RESTful API design
- **TC-014**: TypeScript for type safety
- **TC-015**: Comprehensive testing suite (unit, integration, e2e)

## MVP Scope (Phase 1)

### Included Features
1. AQA examination board support only
2. Paper 7405/1 (Inorganic and Physical Chemistry) focus
3. Basic user registration and authentication
4. PDF upload and OCR processing
5. Core marking engine for common question types
6. Basic feedback generation
7. Simple web interface

### Excluded from MVP
1. Other examination boards
2. Handwritten answer recognition
3. Complex organic structure evaluation
4. Advanced analytics dashboard
5. Mobile application
6. Payment processing
7. Advanced user management

## Success Criteria

### Phase 1 (MVP)
- [ ] Successfully mark 50 sample AQA papers with 90%+ accuracy
- [ ] Process typical paper in under 60 seconds
- [ ] Positive feedback from 20+ student testers
- [ ] System handles 10 concurrent users without issues
- [ ] Zero critical security vulnerabilities

### Phase 2 (Multi-Board)
- [ ] Support for 3+ examination boards
- [ ] 1000+ active users
- [ ] 95%+ marking accuracy across all boards
- [ ] Commercial viability demonstrated
- [ ] Positive teacher feedback and adoption

## Risk Assessment

### High Risk
- **OCR accuracy** for complex chemical formulas
- **Marking algorithm complexity** for subjective questions
- **Markscheme interpretation** variations between examiners

### Medium Risk
- **Performance optimization** for large file processing
- **User adoption** and market acceptance
- **Competition** from existing solutions

### Low Risk
- **Technology stack** maturity and support
- **Team expertise** in web development
- **Funding** for initial development phase

## Compliance and Standards

### Educational Standards
- Alignment with AQA marking guidelines
- Compliance with UK educational regulations
- Accuracy standards for automated assessment

### Data Protection
- GDPR compliance for EU users
- Student data privacy protection
- Secure handling of examination materials

### Accessibility
- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation support