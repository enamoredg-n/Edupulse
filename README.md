# EduPulse AI

Student Feedback Analyzer developed by Team Eureka for the Capgemini Exceller Agentify Buildathon.

EduPulse AI helps colleges collect semester feedback, analyze student comments, group repeated issues, detect urgent concerns, and generate an action report for admins.

## Project Structure

```text
edupulse-backend/   NestJS API, PostgreSQL/Prisma schema, reports, audit logs, AI integration
edupulse-frontend/  Vite React TypeScript frontend for student/admin flows
tools/              Source code PDF generator
deliverables/       Submission PDF containing selected source code
```

## Main Features

- Student and admin login
- Admin feedback form creation
- Live/off feedback control
- Student rating and comment submission
- AI quality filtering for fake or low quality comments
- Duplicate grouping
- Issue/theme detection
- High, Medium, Low priority marking by mention percentage
- Urgent concern detection for safety and misconduct signals
- Admin analytics dashboard
- PDF report generation
- Multi-college data isolation
- Audit logs

## Tech Stack

- Frontend: React, TypeScript, Vite, Recharts
- Backend: NestJS, Prisma, PostgreSQL
- AI Service: Python, FastAPI, local filtering/clustering, Gemini reasoning layer
- Reports: PDF generation from backend

## Running Locally

Backend:

```powershell
cd edupulse-backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run start:dev
```

AI service:

```powershell
cd edupulse-backend\ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Frontend:

```powershell
cd edupulse-frontend
npm install
npm run dev
```

## Validation Commands

```powershell
cd edupulse-backend
npm run build
npm run ai:golden
npm run ai:audit-datasets
npm run test:tenant
```

```powershell
cd edupulse-frontend
npm run build
```

## Submission Note

Generated folders, dependency folders, logs, local secrets, and lock files are not included in the source code PDF. The runnable source code is present in this repository.
