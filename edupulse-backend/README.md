# EduPulse AI Backend

Backend for **EduPulse AI**, a student feedback intelligence system that turns semester feedback and urgent grievances into themes, sentiment, priorities and action plans.

## Tech Stack

- **NestJS + TypeScript**: structured, industry-style backend.
- **PostgreSQL**: relational storage for users, semesters, feedback, grievances, reports and actions.
- **Prisma**: type-safe database access and schema management.
- **JWT**: role-based authentication foundation.
- **Swagger**: API documentation at `/docs`.
- **Python AI Service**: optional self-hosted NLP layer for quality filtering,
  sentiment, BGE/E5 theme clustering, priority scoring, report narrative and
  human corrections.

## What You Need Installed

1. Node.js
2. npm
3. Git
4. PostgreSQL

Optional:
- pgAdmin for viewing PostgreSQL data visually.
- Python 3.11+ for the AI service.

## Setup

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run build
npm run start:dev
```

The backend runs on:

```text
http://localhost:4000
```

Swagger docs:

```text
http://localhost:4000/docs
```

## AI Service

The backend can run without the Python service because it has a deterministic
fallback engine. For the stronger AI demo, start the Python service first:

```bash
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Then set:

```text
AI_SERVICE_URL="http://127.0.0.1:8001"
AI_SERVICE_TIMEOUT_MS=30000
```

The AI service supports two modes:

- Default fallback mode: fast deterministic NLP for demo reliability.
- Hugging Face mode: set `EDUPULSE_ENABLE_HF_MODELS=true` to load local
  RoBERTa sentiment and BGE/E5 embedding models.

Recommended advanced AI mode:

```bash
EDUPULSE_ENABLE_HF_MODELS=true
EDUPULSE_EMBEDDING_MODEL="BAAI/bge-small-en-v1.5"
EDUPULSE_SENTIMENT_MODEL="cardiffnlp/twitter-roberta-base-sentiment-latest"
```

The AI service then prefers:

- RoBERTa sentiment detection.
- BGE/E5 semantic embeddings.
- HDBSCAN density clustering.
- Rule/anomaly fake-feedback filtering.
- Structured report generation.
- Human correction loop through `/human-feedback`.

## Database Setup

Create a PostgreSQL database named:

```text
edupulse
```

Then update `.env` if your username/password is different:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/edupulse?schema=public"
```

Run migrations after PostgreSQL is ready:

```bash
npm run prisma:migrate
```

## API Modules

- `auth`: JWT login for admin and student users.
- `feedback`: active term, categories, questions and semester feedback submission.
- `grievances`: live complaints with anonymity and safety flags.
- `analysis`: theme extraction, sentiment, priority, quality checks and action-plan generation.
- `dashboard`: admin summary, category satisfaction, grievance counts and latest report data.
- `reports`: report listing, detailed report retrieval and PDF download.
- `actions`: owner-ready action items with status tracking.

## Demo Accounts

Run `npm run db:seed`, then login through Swagger or Postman:

```text
Admin
email: admin@edupulse.edu
password: Admin@12345

Student
email: student@edupulse.edu
password: Student@12345
```

In Swagger:

1. Open `http://localhost:4000/docs`
2. Call `POST /api/v1/auth/login`
3. Copy `accessToken`
4. Click **Authorize**
5. Paste token as `Bearer <accessToken>`

## Core Demo Flow

1. Admin/student login with JWT.
2. Student reads active term and feedback categories.
3. Student submits semester feedback.
4. Student files grievance if urgent.
5. Admin opens dashboard summary.
6. Admin runs analysis for the active term.
7. System generates themes, sentiment, priority and action items.
8. Admin views report or downloads PDF.

## Large AI Mock Dataset

To stress-test the AI pipeline with realistic scale:

```bash
npm run db:mock-ai
```

Default output:

- 500 mock students across CSE, ECE, ME, CE and IT.
- 5 feedback categories.
- 20 total questions.
- 10,000 feedback responses.
- Realistic positive, neutral and negative comments.
- Duplicate, useless and low-quality comments for quality-filter testing.
- 180 urgent grievance records with critical/high/medium/low severity.

You can change size with:

```bash
MOCK_STUDENT_COUNT=1000 npm run db:mock-ai
```

## AI Evaluation Proof

To prove the AI pipeline with labeled feedback examples:

```bash
npm run ai:evaluate
```

This generates:

- `docs/ai-evaluation-report.md`
- `ai-service/evaluation/latest_metrics.json`

Current small benchmark:

- Quality/fake-feedback filter accuracy: 100%
- Sentiment accuracy: 100%
- Theme coverage: 100%
- High/Critical priority recall: 100%

Model-choice explanation:

- `docs/ai-model-decision.md`

Note: this is a small labeled hackathon benchmark. In production, the same
framework should be expanded with anonymized real semester feedback.

## Current Milestone

Completed:
- NestJS backend scaffold
- PostgreSQL Prisma schema
- API modules and DTO validation
- Swagger documentation
- JWT authentication and role-based route protection
- Seed data with demo users, categories, questions, feedback and grievances
- Theme, sentiment, priority and action-plan generation
- Data-quality flags for low sample size and duplicate comments
- Safety flag handling for critical grievances
- Dashboard summary APIs
- Report list/detail APIs
- PDF report download
- Action item status tracking
- Optional Python AI service contract and fallback-safe integration
- Labeled AI evaluation dataset and generated accuracy report
- AI model decision documentation for RoBERTa, MiniLM and rule-based filtering

Next:
- Add model warmup/caching scripts for offline demo readiness
- Add automated unit/e2e tests
- Add Docker deployment setup
