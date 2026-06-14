# EduPulse AI

Student Feedback Analyzer developed by Team Eureka for the Capgemini Exceller Agentify Buildathon.

EduPulse AI helps colleges collect semester feedback, clean noisy comments, group repeated issues, detect urgent concerns, and generate a clear action report for admins.

## Project Structure

```text
edupulse-backend/   NestJS API, PostgreSQL/Prisma schema, reports, audit logs, AI integration
edupulse-frontend/  React + TypeScript frontend for student and admin dashboards
tools/              Source code PDF generator
deliverables/       Generated source-code PDF
```

## Main Features

- Student and admin login
- Admin feedback form creation
- Live/off feedback control
- Student rating and comment submission
- AI quality filtering for fake or low-quality comments
- Duplicate grouping
- Issue/theme detection
- High, Medium, Low priority marking
- Urgent concern detection for safety and misconduct signals
- Admin analytics dashboard
- PDF action report generation
- Multi-college data isolation
- Audit logs for admin activity

## Backend Stack and Why

| Component | What we used | Why we used it |
|---|---|---|
| API framework | NestJS with TypeScript | Gives clean modules, controllers, services, DTO validation, and a structure that is easy to explain in system design. |
| Database | PostgreSQL | Feedback, users, colleges, terms, reports, and audit logs are relational data. PostgreSQL gives strong consistency, joins, filtering, and reporting support. |
| ORM | Prisma | Keeps database schema, migrations, and queries typed and easier to maintain. |
| Authentication | JWT + bcryptjs | JWT keeps API calls stateless, while bcrypt hashes passwords before storing them. |
| Validation | class-validator + DTOs | Stops wrong request data before it reaches business logic. |
| Reports | PDFKit | Generates downloadable admin action reports directly from backend data. |
| API docs | Swagger | Helps explain and test REST APIs during judging. |

## AI Stack and What Each Part Does

| Layer | What we used | Role in the system |
|---|---|---|
| AI service | Python FastAPI | Runs the NLP pipeline separately from the main backend, so AI work does not make the API code messy. |
| Quality filter | Rule-based checks + weighted scoring | Removes fake text, random words, very short comments, repeated spam, abusive noise, and low-value responses before issue extraction. |
| Sentiment model | `cardiffnlp/twitter-roberta-base-sentiment-latest` | Reads useful comments and helps classify them as positive, neutral, negative, or critical. If the model is unavailable, rating + lexicon logic is used as fallback. |
| Embedding model | `BAAI/bge-small-en-v1.5` | Converts comments into semantic vectors so similar complaints can be grouped even when students write them in different words. |
| Clustering | HDBSCAN + MiniBatchKMeans fallback | Groups similar comments into issue clusters and helps detect outliers/noise. |
| Backup clustering | TF-IDF + keyword fallback | Keeps analysis working even if transformer models are not loaded. |
| Taxonomy layer | Custom college issue rules | Separates mess, faculty, infrastructure, academics, placement, safety, and other issue types with more control. |
| Gemini layer | Gemini 2.5 Flash on final clusters only | Used after filtering and clustering to detect rare serious concerns and write simple admin-readable summaries/action-plan wording. |

## Frontend Stack and Why

| Component | What we used | Why we used it |
|---|---|---|
| UI framework | React with TypeScript | Helps build reusable student/admin screens with safer typed state. |
| Build tool | Vite | Fast development server and optimized production build. |
| Charts | Recharts | Used for radar charts, pie charts, bar charts, and comparison visuals on the admin dashboard. |
| Icons | Lucide React | Clean, consistent icons without heavy custom SVG work. |
| 3D/visual layer | Three.js + CSS animations | Used for premium landing-page visuals and animated product feel. |
| Styling | CSS modules/files with responsive rules | Gives full control over layout, hover effects, dashboards, login pages, and report pages. |

## System Flow

```text
Student/Admin Login
        |
        v
NestJS REST API
        |
        v
PostgreSQL + Prisma
        |
        v
FastAPI AI Service
        |
        v
Quality Filter -> Sentiment -> Embeddings -> Clustering -> Gemini Reasoning
        |
        v
Admin Dashboard + PDF Action Report
```

## Why This Architecture Fits the Problem

The problem is not only about collecting feedback. The real challenge is turning large, messy student comments into fair and useful decisions.

EduPulse AI keeps the normal product flow in the NestJS backend, keeps structured institutional data in PostgreSQL, and keeps AI processing in a separate Python service. This makes the system easier to scale, easier to debug, and easier to explain in front of judges.

The AI pipeline first reduces noise, then groups repeated issues, then uses Gemini only on final issue clusters. This avoids sending thousands of raw comments directly to an LLM and makes the result more explainable.
