# API Flow

## Student Feedback Flow

```text
POST /api/v1/feedback/submit
        ↓
Validate student, term, category and question IDs
        ↓
Store feedback submission and answers
        ↓
Dashboard can count responses by term/category
```

## Grievance Flow

```text
POST /api/v1/grievances
        ↓
Validate category, severity, anonymity and description
        ↓
If severity is CRITICAL or category is safety/ragging, mark safetyFlag=true
        ↓
Admin dashboard shows urgent alerts first
```

## AI Analysis Flow

```text
POST /api/v1/analysis/run
        ↓
Fetch feedback responses for the selected term
        ↓
Run quality checks:
  - duplicate comment count
  - low sample warning
  - response count
        ↓
Future LLM step:
  - extract themes
  - detect sentiment
  - rank priority
  - suggest actions
        ↓
Store analysis report in PostgreSQL
```

## Admin Dashboard Flow

```text
GET /api/v1/dashboard/summary
        ↓
Return total responses, grievances and latest report
```

## Report Flow

```text
GET /api/v1/reports/:id
        ↓
Return report with themes and action items
```
