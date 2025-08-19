# AQA Chemistry Automated Marking System

An automated marking system for AQA A-Level Chemistry papers, starting with Paper 7405/1 (Inorganic and Physical Chemistry).

## Features

- **PDF Processing**: Upload and process student answer sheets
- **OCR Integration**: Extract text and formulas using Mathpix OCR
- **Automated Marking**: Mark papers based on AQA markschemes
- **Detailed Feedback**: Provide question-by-question feedback
- **Chemistry-Specific**: Handle chemical equations, formulas, and terminology

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js, Prisma, PostgreSQL
- **External**: Mathpix OCR, AWS S3, SendGrid

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm 10+

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Set up the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the development servers:
   ```bash
   npm run dev
   ```

## Development

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

## Scripts

- `npm run dev` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run type-check` - Check TypeScript types

## Project Structure

```
├── backend/          # Node.js backend
├── frontend/         # React frontend
├── shared/           # Shared types and utilities
├── docs/             # Documentation
└── scripts/          # Build and deployment scripts
```

## Contributing

1. Follow the code style guidelines in CLAUDE.md
2. Write tests for new features
3. Ensure all tests pass before submitting PRs
4. Update documentation as needed

## License

MIT