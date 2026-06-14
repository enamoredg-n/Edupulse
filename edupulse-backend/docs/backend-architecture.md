# EduPulse AI Backend Architecture

## Backend Decision

EduPulse AI uses **NestJS + TypeScript** for the backend.

Reason:
- NestJS gives a structured module/service/controller architecture.
- TypeScript keeps frontend and backend language consistent.
- It is easier to defend than plain Express because it supports validation, dependency injection, guards, and clean API modules.
- It is faster for this buildathon than Spring Boot while still keeping an enterprise-style structure.

Spring Boot is also a strong option, but for this team and project NestJS gives faster execution with strong structure.

## Database Decision

EduPulse AI uses **PostgreSQL**.

Reason:
- The data is relational: users, departments, semesters, questions, feedback, grievances, reports, and action items are connected.
- PostgreSQL is better for dashboard queries, semester comparisons, and reporting.
- It gives strong consistency for admin decisions.
- It supports JSON fields, so AI outputs can still be stored flexibly.

MongoDB is flexible, but this project needs reliable relationships and analytics more than document-only storage.

## System Flow

```text
Student submits feedback/grievance
        ↓
React frontend calls NestJS REST API
        ↓
Backend validates request and stores data
        ↓
PostgreSQL keeps feedback history
        ↓
Data quality checks run before AI
        ↓
LLM analysis finds themes, sentiment and priority
        ↓
Admin dashboard shows insights and alerts
        ↓
Action items and reports track improvement
```

## Main Modules

- `AuthModule`: login and JWT token generation.
- `FeedbackModule`: semester feedback categories and submissions.
- `GrievancesModule`: urgent complaints, severity, anonymity, safety flags.
- `AnalysisModule`: data quality checks and future LLM analysis orchestration.
- `DashboardModule`: summary metrics for admin screens.
- `ActionsModule`: owner, timeline, KPI, and status tracking.
- `ReportsModule`: analysis report retrieval.

## AI Boundary

AI is not used for everything. It is used only where it adds value:
- grouping repeated comments into themes
- sentiment understanding
- priority ranking
- action plan generation

Admin approval remains part of the system, so AI is decision support, not final authority.
