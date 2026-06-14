# EduPulse AI Evaluation Report

Generated: 2026-06-14T14:36:55.861046+00:00

Dataset: EduPulse College Feedback Evaluation Set (2026-06-10)

Model mode: `deterministic-fallback-safe-mode`

## Scorecard

| Metric | Score | Meaning |
| --- | ---: | --- |
| Quality / fake-feedback filter | 100.0% | Detects useful vs useless, duplicate, random, repeated feedback |
| Sentiment accuracy | 100.0% | Predicts Positive, Neutral, Negative, Critical |
| Theme coverage | 92.86% | Finds expected college issue themes in output themes/evidence |
| Priority placement | 100.0% | Places High/Critical expected issues in High/Critical themes/actions |
| Overall evaluation score | 98.21% | Average of the four proof metrics |

## Dataset Size

- Feedback samples: 21
- Legacy safety samples converted to feedback: 3
- Total labeled samples: 21

## Analysis Run Summary

- AI confidence: 69%
- Themes generated: 10
- Action items generated: 2
- Service summary: EduPulse Evaluation Term: 21 response(s) were reduced into 11 issue cluster(s) using 17 useful signal comment(s). Top issue areas are Ragging concern, Mess hygiene and food availability issue, Campus lighting issue.

## Quality Filter Breakdown

```json
{
  "totalComments": 21,
  "usefulComments": 17,
  "usefulSignalComments": 17,
  "uniqueUsefulComments": 16,
  "duplicateCount": 1,
  "lowQualityRejectedCount": 4,
  "rejected": {
    "too_short": 3,
    "repeated_words": 1
  },
  "rejectedExamples": [
    {
      "comment": "aaaaaaa",
      "topic": "Food & Mess",
      "question": "How satisfied are you with food quality?",
      "source": "CSE student, Semester 5",
      "reason": "too_short",
      "decision": "Ignored from theme analysis"
    },
    {
      "comment": "good good good good good",
      "topic": "Faculty",
      "question": "How satisfied are you with teaching clarity?",
      "source": "ME student, Semester 3",
      "reason": "repeated_words",
      "decision": "Ignored from theme analysis"
    },
    {
      "comment": "1234567890",
      "topic": "Infrastructure",
      "question": "How available are lab systems during practical work?",
      "source": "IT student, Semester 5",
      "reason": "too_short",
      "decision": "Ignored from theme analysis"
    },
    {
      "comment": "ok",
      "topic": "Sports & Campus",
      "question": "How safe do you feel on campus after regular hours?",
      "source": "CE student, Semester 3",
      "reason": "too_short",
      "decision": "Ignored from theme analysis"
    }
  ],
  "duplicateExamples": [
    {
      "comment": "Wi-Fi is not working in the lab block and online practicals are getting delayed.",
      "topic": "Infrastructure",
      "repeated": 2,
      "decision": "Grouped as repeated signal"
    }
  ]
}
```

## Top Generated Themes

- **Wi-Fi connectivity issue** - HIGH / NEGATIVE (3 mentions)
- **Mess hygiene and food availability issue** - HIGH / NEGATIVE (2 mentions)
- **Lab equipment issue** - MEDIUM / NEGATIVE (1 mentions)
- **Projector issue** - MEDIUM / NEGATIVE (1 mentions)
- **Campus lighting issue** - MEDIUM / NEGATIVE (1 mentions)
- **Faculty doubt support issue** - MEDIUM / NEGATIVE (1 mentions)
- **Faculty marks partiality issue** - MEDIUM / NEGATIVE (1 mentions)
- **Academic workload issue** - MEDIUM / NEGATIVE (1 mentions)

## Known Misses

Quality misses: None.

Sentiment misses: None.

Theme misses: campus safety

Priority misses: None.

## How To Re-run

```powershell
cd "C:\Users\gaura\OneDrive\Desktop\Hack Prix\Edupulse-push\edupulse-backend"
python ai-service/evaluation/evaluate_ai.py
```
