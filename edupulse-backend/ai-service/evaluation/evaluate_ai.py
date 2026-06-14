from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
AI_SERVICE = ROOT / "ai-service"
sys.path.insert(0, str(AI_SERVICE))

from app.main import (  # noqa: E402
    AnalysisRequest,
    FeedbackItem,
    Term,
    analyze,
    build_feedback_documents,
    classify_sentiments,
    model_mode,
    normalize_text,
    quality_filter,
    reject_reason,
)


DATASET_PATH = Path(__file__).with_name("labeled_feedback.json")
METRICS_PATH = Path(__file__).with_name("latest_metrics.json")
REPORT_PATH = ROOT / "docs" / "ai-evaluation-report.md"

THEME_STOPWORDS = {
    "issue",
    "signal",
    "support",
    "quality",
    "campus",
    "college",
    "student",
    "students",
}


def main() -> None:
    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    evaluation_dataset = normalize_legacy_grievances_to_feedback(dataset)
    feedback = [FeedbackItem(**item) for item in evaluation_dataset["feedback"]]

    quality_rows = evaluate_quality_filter(evaluation_dataset["feedback"], feedback)
    useful_feedback = [
        item
        for item, row in zip(feedback, quality_rows)
        if row["predictedUseful"]
    ]

    sentiment_rows = evaluate_sentiment(evaluation_dataset, useful_feedback)
    analysis = analyze(
        AnalysisRequest(
            term=Term(id="eval-term", name="EduPulse Evaluation Term"),
            feedback=feedback,
            grievances=[],
        )
    )
    theme_rows = evaluate_theme_coverage(evaluation_dataset, analysis)
    priority_rows = evaluate_priority_recall(evaluation_dataset, analysis)

    metrics = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "datasetName": dataset["datasetName"],
        "datasetVersion": dataset["version"],
        "modelMode": model_mode(),
        "sampleSize": {
            "feedback": len(feedback),
            "legacySafetyFeedbackConverted": len(dataset.get("grievances", [])),
            "total": len(feedback),
        },
        "qualityFilterAccuracy": accuracy(quality_rows),
        "sentimentAccuracy": accuracy(sentiment_rows),
        "themeCoverage": accuracy(theme_rows),
        "priorityPlacement": accuracy(priority_rows),
        "overallScore": round(
            (
                accuracy(quality_rows)["score"]
                + accuracy(sentiment_rows)["score"]
                + accuracy(theme_rows)["score"]
                + accuracy(priority_rows)["score"]
            )
            / 4,
            4,
        ),
        "qualityBreakdown": quality_filter(feedback)["summary"],
        "analysisSummary": analysis["summary"],
        "analysisConfidence": analysis["confidence"],
        "themeCount": len(analysis["themes"]),
        "actionCount": len(analysis["actions"]),
        "rows": {
            "quality": quality_rows,
            "sentiment": sentiment_rows,
            "themes": theme_rows,
            "priority": priority_rows,
        },
    }

    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    REPORT_PATH.write_text(render_report(metrics, analysis), encoding="utf-8")
    print(json.dumps(summary_for_console(metrics), indent=2))


def normalize_legacy_grievances_to_feedback(dataset: dict[str, Any]) -> dict[str, Any]:
    feedback = list(dataset["feedback"])
    for index, item in enumerate(dataset.get("grievances", []), start=1):
        severity = str(item.get("severity", "MEDIUM"))
        category = str(item.get("category", "Safety"))
        feedback.append(
            {
                "id": f"legacy-safety-feedback-{index}",
                "categoryId": f"cat-{normalize_text(category).replace(' ', '-')}",
                "categoryName": category,
                "questionId": f"q-legacy-safety-{index}",
                "questionText": "Describe any safety-sensitive campus concern.",
                "rating": 1 if severity in {"HIGH", "CRITICAL"} else 2,
                "comment": f"{item.get('title', '')}. {item.get('description', '')}".strip(),
                "departmentCode": item.get("departmentCode"),
                "semesterNumber": None,
                "expectedSentiment": item.get("expectedSentiment", "NEGATIVE"),
                "expectedUseful": True,
                "expectedTheme": item.get("expectedTheme", category),
                "expectedPriority": item.get("expectedPriority", "MEDIUM"),
            }
        )

    return {**dataset, "feedback": feedback, "grievances": []}


def evaluate_quality_filter(
    raw_feedback: list[dict[str, Any]], feedback: list[FeedbackItem]
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    rows = []

    for raw, item in zip(raw_feedback, feedback):
        comment = normalize_text(item.comment or "")
        reason = reject_reason(comment) if comment else "empty"
        fingerprint = f"{item.categoryId}:{comment}"
        duplicate = bool(comment and fingerprint in seen)
        predicted_useful = bool(comment and not reason and not duplicate)

        if comment:
            seen.add(fingerprint)

        expected_useful = bool(raw["expectedUseful"])
        rows.append(
            {
                "id": item.id,
                "expectedUseful": expected_useful,
                "predictedUseful": predicted_useful,
                "correct": expected_useful == predicted_useful,
                "reason": "duplicate" if duplicate else reason,
                "comment": item.comment,
            }
        )

    return rows


def evaluate_sentiment(
    dataset: dict[str, Any],
    useful_feedback: list[FeedbackItem],
) -> list[dict[str, Any]]:
    feedback_docs = build_feedback_documents(useful_feedback)
    docs = feedback_docs
    predictions = classify_sentiments(docs)
    expected_by_id = {
        item["id"]: item["expectedSentiment"]
        for item in dataset["feedback"]
        if item["expectedUseful"]
    }

    rows = []
    for doc in docs:
        expected = expected_by_id[doc["id"]]
        predicted = predictions[doc["id"]]
        rows.append(
            {
                "id": doc["id"],
                "expected": expected,
                "predicted": predicted,
                "correct": expected == predicted,
                "text": doc["text"],
            }
        )

    return rows


def evaluate_theme_coverage(
    dataset: dict[str, Any], analysis: dict[str, Any]
) -> list[dict[str, Any]]:
    expected_themes = sorted(
        {
            item["expectedTheme"]
            for item in dataset["feedback"]
            if item["expectedUseful"]
        }
    )

    rows = []
    theme_text = analysis_text(analysis)
    for theme in expected_themes:
        tokens = theme_tokens(theme)
        covered = any(token in theme_text for token in tokens)
        rows.append(
            {
                "theme": theme,
                "tokensChecked": tokens,
                "covered": covered,
                "correct": covered,
            }
        )

    return rows


def evaluate_priority_recall(
    dataset: dict[str, Any], analysis: dict[str, Any]
) -> list[dict[str, Any]]:
    expected_priority_themes = sorted(
        {
            item["expectedTheme"]
            for item in dataset["feedback"]
            if item["expectedUseful"] and item["expectedPriority"] in {"HIGH", "CRITICAL"}
        }
    )
    urgent_text = analysis_text(
        {
            **analysis,
            "themes": [
                theme
                for theme in analysis["themes"]
                if theme["priority"] in {"HIGH", "CRITICAL"}
            ],
        }
    )

    rows = []
    for theme in expected_priority_themes:
        tokens = theme_tokens(theme)
        recalled = any(token in urgent_text for token in tokens)
        rows.append(
            {
                "theme": theme,
                "expectedPriority": "HIGH_OR_CRITICAL",
                "placedInHighOrCriticalLayer": recalled,
                "correct": recalled,
            }
        )

    return rows


def theme_tokens(theme: str) -> list[str]:
    tokens = [
        token
        for token in normalize_text(theme).split()
        if len(token) > 3 and token not in THEME_STOPWORDS
    ]
    return tokens or [normalize_text(theme)]


def analysis_text(analysis: dict[str, Any]) -> str:
    chunks = [analysis.get("summary", "")]
    for theme in analysis.get("themes", []):
        chunks.extend(
            [
                str(theme.get("title", "")),
                str(theme.get("summary", "")),
                json.dumps(theme.get("evidence", {})),
            ]
        )
    for action in analysis.get("actions", []):
        chunks.append(json.dumps(action))
    raw_json = analysis.get("rawJson", {})
    if isinstance(raw_json, dict):
        chunks.append(json.dumps(raw_json.get("categorySignals", [])))
        chunks.append(json.dumps(raw_json.get("sentimentBreakdown", {})))
    return normalize_text(" ".join(chunks))


def accuracy(rows: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(rows)
    correct = sum(1 for row in rows if row["correct"])
    score = correct / total if total else 0
    return {
        "correct": correct,
        "total": total,
        "score": round(score, 4),
        "percentage": round(score * 100, 2),
    }


def summary_for_console(metrics: dict[str, Any]) -> dict[str, Any]:
    return {
        "modelMode": metrics["modelMode"],
        "qualityFilterAccuracy": metrics["qualityFilterAccuracy"]["percentage"],
        "sentimentAccuracy": metrics["sentimentAccuracy"]["percentage"],
        "themeCoverage": metrics["themeCoverage"]["percentage"],
        "priorityPlacement": metrics["priorityPlacement"]["percentage"],
        "overallScore": round(metrics["overallScore"] * 100, 2),
        "report": str(REPORT_PATH),
    }


def render_report(metrics: dict[str, Any], analysis: dict[str, Any]) -> str:
    quality_misses = [row for row in metrics["rows"]["quality"] if not row["correct"]]
    sentiment_misses = [row for row in metrics["rows"]["sentiment"] if not row["correct"]]
    theme_misses = [row for row in metrics["rows"]["themes"] if not row["correct"]]
    priority_misses = [row for row in metrics["rows"]["priority"] if not row["correct"]]

    return f"""# EduPulse AI Evaluation Report

Generated: {metrics["generatedAt"]}

Dataset: {metrics["datasetName"]} ({metrics["datasetVersion"]})

Model mode: `{metrics["modelMode"]}`

## Scorecard

| Metric | Score | Meaning |
| --- | ---: | --- |
| Quality / fake-feedback filter | {metrics["qualityFilterAccuracy"]["percentage"]}% | Detects useful vs useless, duplicate, random, repeated feedback |
| Sentiment accuracy | {metrics["sentimentAccuracy"]["percentage"]}% | Predicts Positive, Neutral, Negative, Critical |
| Theme coverage | {metrics["themeCoverage"]["percentage"]}% | Finds expected college issue themes in output themes/evidence |
| Priority placement | {metrics["priorityPlacement"]["percentage"]}% | Places High/Critical expected issues in High/Critical themes/actions |
| Overall evaluation score | {round(metrics["overallScore"] * 100, 2)}% | Average of the four proof metrics |

## Dataset Size

- Feedback samples: {metrics["sampleSize"]["feedback"]}
- Legacy safety samples converted to feedback: {metrics["sampleSize"]["legacySafetyFeedbackConverted"]}
- Total labeled samples: {metrics["sampleSize"]["total"]}

## Analysis Run Summary

- AI confidence: {round(metrics["analysisConfidence"] * 100)}%
- Themes generated: {metrics["themeCount"]}
- Action items generated: {metrics["actionCount"]}
- Service summary: {metrics["analysisSummary"]}

## Quality Filter Breakdown

```json
{json.dumps(metrics["qualityBreakdown"], indent=2)}
```

## Top Generated Themes

{render_theme_list(analysis["themes"])}

## Known Misses

Quality misses: {render_miss_list(quality_misses, "id")}

Sentiment misses: {render_sentiment_misses(sentiment_misses)}

Theme misses: {render_miss_list(theme_misses, "theme")}

Priority misses: {render_miss_list(priority_misses, "theme")}

## How To Re-run

```powershell
cd "{ROOT}"
python ai-service/evaluation/evaluate_ai.py
```
"""


def render_theme_list(themes: list[dict[str, Any]]) -> str:
    rows = []
    for theme in themes[:8]:
        rows.append(
            f"- **{theme['title']}** - {theme['priority']} / {theme['sentiment']} "
            f"({theme['mentionCount']} mentions)"
        )
    return "\n".join(rows) if rows else "- No themes generated."


def render_miss_list(rows: list[dict[str, Any]], key: str) -> str:
    if not rows:
        return "None."
    return ", ".join(str(row[key]) for row in rows)


def render_sentiment_misses(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "None."
    counts = Counter(f"{row['expected']}->{row['predicted']}" for row in rows)
    return ", ".join(f"{label}: {count}" for label, count in counts.items())


if __name__ == "__main__":
    main()
