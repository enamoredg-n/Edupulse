# EduPulse AI Service

This service is the custom AI layer for EduPulse. It is separate from the
NestJS API so feedback APIs stay clean and NLP workloads can scale separately.

## What It Does

- Cleans duplicate, very short, repeated, and spam-like feedback.
- Runs sentiment detection with a local RoBERTa model when enabled.
- Groups similar feedback with BGE/E5 embeddings and HDBSCAN density clustering.
- Uses an explainable priority score for Critical/High/Medium/Low decisions.
- Generates a structured executive narrative for dashboard/PDF reporting.
- Stores human corrections so admins can create future labeled training data.
- Returns structured themes and actions to the NestJS backend.

The service has deterministic fallbacks, so the app can still demo even if model
weights are not downloaded yet.

## Setup

```powershell
cd "C:\Users\gaura\OneDrive\Desktop\Hack Prix\edupulse-backend\ai-service"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

## Evaluation Proof

EduPulse includes a labeled college-feedback benchmark so we can prove the AI
pipeline instead of only claiming it works.

```powershell
cd "C:\Users\gaura\OneDrive\Desktop\Hack Prix\edupulse-backend"
npm run ai:evaluate
```

This evaluates:

- Quality/fake-feedback filtering accuracy.
- Sentiment accuracy.
- Theme coverage.
- High/Critical priority recall.

Generated files:

- `docs/ai-evaluation-report.md`
- `ai-service/evaluation/latest_metrics.json`

Current labeled benchmark score:

- Quality filter accuracy: 100%
- Sentiment accuracy: 100%
- Theme coverage: 100%
- Urgent priority recall: 100%

This is a small labeled hackathon benchmark. For production, we would expand it
with anonymized real feedback from multiple semesters.

Then add this to backend `.env`:

```env
AI_SERVICE_URL="http://127.0.0.1:8001"
AI_SERVICE_TIMEOUT_MS=30000
```

## Model Mode

By default, the service uses deterministic fallback logic to avoid first-run
download delays. To load Hugging Face models locally:

```powershell
$env:EDUPULSE_ENABLE_HF_MODELS="true"
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Optional model overrides:

```powershell
$env:EDUPULSE_SENTIMENT_MODEL="cardiffnlp/twitter-roberta-base-sentiment-latest"
$env:EDUPULSE_EMBEDDING_MODEL="BAAI/bge-small-en-v1.5"
```

You can also use an E5 embedding model:

```powershell
$env:EDUPULSE_EMBEDDING_MODEL="intfloat/e5-base-v2"
```

Useful endpoints:

- `GET /models` - shows active model stack and fallbacks.
- `POST /analyze` - runs the full AI analysis pipeline.
- `POST /human-feedback` - records admin corrections for future learning.
- `GET /human-feedback/summary` - shows correction counts.
