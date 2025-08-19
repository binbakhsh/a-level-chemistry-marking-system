# Working with Claude Code for AQA Chemistry Marking System

## Project Overview
Building an automated marking system for AQA A-Level Chemistry papers, starting with Paper 7405/1 (Inorganic and Physical Chemistry).

## Claude Code Best Practices

### 1. Project Structure Commands
```bash
# Initialize the project
claude code init chemistry-marker

# Create directory structure
claude code scaffold --template react-node

# Add specific chemistry modules
claude code add module --name "markscheme-parser"
claude code add module --name "ocr-processor" 
claude code add module --name "marking-engine"
```

### 2. Effective Prompting for Chemistry Features

#### OCR Integration
```
Implement PDF text extraction using Mathpix OCR API for AQA chemistry papers:
- Handle chemical equations and formulas
- Extract question numbers and student answers
- Parse tables and structured data
- Return structured JSON with question-answer mapping
```

#### Markscheme Processing
```
Create a markscheme parser for AQA format:
- Parse marking points (M1, M2, etc.)
- Handle alternative answers (OR statements)
- Implement list penalty rules ("right + wrong = wrong")
- Support partial credit allocation
```

#### Answer Matching
```
Build fuzzy matching for chemistry answers:
- Chemical formula variations (H2SO4 vs H₂SO₄)
- Phonetic spelling acceptance
- Equation balancing verification
- IUPAC nomenclature checking
```

### 3. Development Workflow

#### Step 1: Backend Setup
```
Create Express.js backend with:
- Multer for file uploads
- PDF processing endpoints
- Markscheme CRUD operations
- Marking algorithm implementation
- PostgreSQL integration with Prisma
```

#### Step 2: Frontend Implementation  
```
Build React frontend with:
- File upload component for PDFs
- Exam board/paper selection
- Results display with detailed feedback
- Progress tracking dashboard
- Responsive design with Tailwind CSS
```

#### Step 3: Database Design
```
Design schema for:
- Examination boards and papers
- Markscheme storage with nested JSON
- Student submissions and results
- Question-level analytics
```

### 4. Testing Strategy

#### Unit Testing
```
Test individual components:
- OCR accuracy with sample chemistry papers
- Markscheme parsing correctness
- Answer matching algorithms
- Feedback generation quality
```

#### Integration Testing
```
Test full workflow:
- PDF upload → OCR → marking → feedback
- Multiple question types handling
- Error handling and edge cases
- Performance with large files
```

### 5. Chemistry-Specific Challenges

#### Chemical Equations
- Balance checking algorithms
- State symbol handling (optional vs required)
- Multiple valid representations
- Organic structure validation

#### Scientific Terminology
- Phonetic spelling acceptance
- IUPAC vs common names
- Technical vocabulary matching
- Unit validation and conversion

#### Marking Complexities
- Consequential marking (ECF)
- List penalty calculations
- Partial credit allocation
- Extended response evaluation

### 6. Deployment Preparation

#### Environment Setup
```
Configure for production:
- Environment variables for API keys
- Database connection strings
- OCR service configuration
- File storage setup (AWS S3/local)
```

#### Performance Optimization
```
Implement:
- PDF processing queues
- Caching for markschemes
- Database indexing
- API rate limiting
```

## Code Quality Guidelines

### File Organization
```
src/
├── components/          # React components
├── services/           # API calls and business logic
├── utils/              # Helper functions
├── types/              # TypeScript definitions
├── hooks/              # Custom React hooks
└── __tests__/          # Test files
```

### Naming Conventions
- Components: PascalCase (`MarkschemeUpload.jsx`)
- Functions: camelCase (`parseChemicalEquation`)
- Constants: UPPER_SNAKE_CASE (`AQA_PAPER_CODES`)
- Files: kebab-case (`marking-engine.js`)

### Error Handling
- Comprehensive try-catch blocks
- User-friendly error messages
- Logging for debugging
- Graceful fallbacks

## Communication with Claude

### Effective Request Patterns
1. **Be Specific**: "Add validation for AQA question numbering format (01.1, 01.2, etc.)"
2. **Provide Context**: Include markscheme examples when requesting features
3. **Ask for Explanations**: Request comments explaining chemistry-specific logic
4. **Iterative Development**: Build features incrementally, test, then enhance

### Code Review Requests
```
Review this marking algorithm for AQA chemistry:
- Check accuracy against markscheme rules
- Verify edge case handling
- Suggest performance improvements
- Validate chemistry-specific logic
```

## Getting Started Checklist

- [ ] Set up project structure with Claude Code
- [ ] Configure development environment
- [ ] Implement basic PDF upload
- [ ] Integrate Mathpix OCR
- [ ] Create markscheme data structure
- [ ] Build core marking engine
- [ ] Add frontend interface
- [ ] Test with AQA sample papers
- [ ] Deploy MVP version
- [ ] Plan multi-board expansion