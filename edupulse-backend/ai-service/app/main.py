from __future__ import annotations

import json
import math
import os
import re
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

try:
    import numpy as np
    from sklearn.cluster import HDBSCAN
    from sklearn.cluster import MiniBatchKMeans
    from sklearn.feature_extraction.text import TfidfVectorizer
except Exception:  # pragma: no cover - fallback mode for minimal installs
    np = None
    HDBSCAN = None
    MiniBatchKMeans = None
    TfidfVectorizer = None


Sentiment = Literal["POSITIVE", "NEUTRAL", "NEGATIVE", "CRITICAL"]
Priority = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]

CRITICAL_WORDS = {
    "ragging",
    "ragged",
    "harassment",
    "abuse",
    "corruption",
    "bribe",
    "extortion",
    "unsafe",
    "snake",
    "gun",
    "weapon",
    "firing",
    "shooting",
    "threat",
    "threatening",
    "violence",
    "assault",
    "emergency",
    "bully",
    "bullying",
    "intimidating",
    "stomach problem",
    "stomach problems",
    "food poisoning",
    "contaminated food",
    "illness",
}

ULTRA_CONCERN_WORDS = {
    "ragging",
    "ragged",
    "harassment",
    "harass",
    "misconduct",
    "abuse",
    "bully",
    "bullying",
    "physical touch",
    "molest",
    "assault",
    "violence",
    "threat",
    "threatening",
    "gun",
    "weapon",
    "firing",
    "shooting",
    "knife",
    "snake",
    "animal attack",
    "corruption",
    "bribe",
    "extortion",
    "forced money",
    "taking money",
    "water contamination",
    "water ph",
    "ph level",
    "contaminated water",
    "food poisoning",
    "electric shock",
    "electrocution",
    "fire",
    "gas leak",
    "ceiling fall",
    "ceiling plaster",
    "roof fall",
    "wall crack",
    "building collapse",
    "plaster fall",
    "plaster falling",
    "can injure",
}

HEALTH_RISK_WORDS = {
    "insects",
    "medical",
    "health",
    "illness",
    "sick",
    "stomach",
    "uncooked",
    "undercooked",
}

NEGATIVE_WORDS = {
    "bad",
    "poor",
    "worst",
    "dirty",
    "slow",
    "broken",
    "partiality",
    "issue",
    "problem",
    "unfair",
    "late",
    "cold",
    "rude",
    "behaviour",
    "behavior",
    "corruption",
    "short",
    "lack",
    "lacks",
    "not working",
    "unavailable",
    "not available",
}

FACULTY_ATTENDANCE_HINTS = {
    "not attending",
    "not taking class",
    "not taking classes",
    "not coming",
    "absent",
    "late to class",
    "late in class",
    "classes are missed",
    "class is missed",
    "irregular class",
    "irregular classes",
    "skips class",
    "skip classes",
    "misses lecture",
    "misses lectures",
}

FACULTY_MARKS_HINTS = {
    "partiality",
    "marks",
    "practical marks",
    "internal marks",
    "unfair marking",
    "biased marks",
}

FACULTY_BEHAVIOUR_HINTS = {
    "behaviour",
    "behavior",
    "rude",
    "harshly",
    "insult",
    "respectful",
    "ignore",
    "scold",
    "discouraging",
}

ISSUE_TAXONOMY: list[dict[str, Any]] = [
    {
        "bucket": "RAGGING",
        "title": "Ragging concern",
        "type": "urgent",
        "phrases": ["ragging", "ragged", "bully", "bullying", "senior forced", "seniors forced"],
    },
    {
        "bucket": "FACULTY_HARASSMENT",
        "title": "Harassment concern",
        "type": "urgent",
        "phrases": [
            "harassment",
            "harass",
            "physical touch",
            "misconduct",
            "molest",
            "abuse",
            "unsafe behaviour",
            "unsafe behavior",
        ],
    },
    {
        "bucket": "WATER_CONTAMINATION",
        "title": "Water contamination concern",
        "type": "urgent",
        "phrases": ["water contamination", "contaminated water", "water ph", "ph level", "unsafe drinking water"],
    },
    {
        "bucket": "WEAPON_VIOLENCE",
        "title": "Weapon or violence concern",
        "type": "urgent",
        "phrases": ["gun", "weapon", "firing", "shooting", "knife", "violence", "assault", "attack"],
    },
    {
        "bucket": "ANIMAL_DANGER",
        "title": "Campus animal danger",
        "type": "urgent",
        "phrases": ["snake", "animal attack", "dog bite"],
    },
    {
        "bucket": "CORRUPTION",
        "title": "Corruption concern",
        "type": "urgent",
        "phrases": ["corruption", "bribe", "extortion", "forced money", "taking money", "money collection was not transparent"],
    },
    {
        "bucket": "BUILDING_INJURY",
        "title": "Building injury concern",
        "type": "urgent",
        "phrases": ["ceiling fall", "ceiling plaster", "roof fall", "wall crack", "building collapse", "plaster fall", "plaster falling", "can injure"],
    },
    {
        "bucket": "ELECTRIC_FIRE",
        "title": "Electric or fire safety concern",
        "type": "urgent",
        "phrases": ["electric shock", "electrocution", "short circuit", "fire", "smoke", "gas leak"],
    },
    {
        "bucket": "FOOD_POISONING",
        "title": "Food poisoning concern",
        "type": "urgent",
        "phrases": ["food poisoning", "stomach infection", "students got sick", "students fell sick"],
    },
    {
        "bucket": "FACULTY_MARKS_PARTIALITY",
        "title": "Faculty marks partiality issue",
        "type": "normal",
        "categoryHints": ["faculty", "academics"],
        "phrases": list(FACULTY_MARKS_HINTS),
    },
    {
        "bucket": "FACULTY_ATTENDANCE",
        "title": "Faculty attendance issue",
        "type": "normal",
        "categoryHints": ["faculty"],
        "phrases": list(FACULTY_ATTENDANCE_HINTS),
    },
    {
        "bucket": "FACULTY_SUBJECT_KNOWLEDGE",
        "title": "Faculty subject knowledge issue",
        "type": "normal",
        "categoryHints": ["faculty"],
        "phrases": ["lack knowledge", "lacks knowledge", "subject knowledge", "cannot explain", "concepts clearly", "teaching is not helping"],
    },
    {
        "bucket": "FACULTY_BEHAVIOUR",
        "title": "Faculty behaviour issue",
        "type": "normal",
        "categoryHints": ["faculty"],
        "phrases": list(FACULTY_BEHAVIOUR_HINTS),
    },
    {
        "bucket": "FACULTY_DOUBT_SUPPORT",
        "title": "Faculty doubt support issue",
        "type": "normal",
        "categoryHints": ["faculty"],
        "phrases": ["doubt", "doubts", "doubt session", "doubt sessions", "doubts are not solved", "not solving doubts"],
    },
    {
        "bucket": "FACULTY_COMMUNICATION",
        "title": "Faculty communication issue",
        "type": "normal",
        "categoryHints": ["faculty"],
        "phrases": ["communication", "explain", "explanation", "clarity", "teaching clarity", "not explaining"],
    },
    {
        "bucket": "FACULTY_REPLACEMENT",
        "title": "Faculty replacement request",
        "type": "normal",
        "categoryHints": ["faculty"],
        "phrases": ["new faculty", "replace faculty", "change faculty"],
    },
    {
        "bucket": "FACULTY_TEACHING_SUPPORT",
        "title": "Faculty teaching support issue",
        "type": "normal",
        "categoryHints": ["faculty"],
        "phrases": [
            "faculty",
            "teacher",
            "teaching",
            "lecture",
            "lectures",
            "class",
            "practical examples",
            "examples needed",
            "more practical examples",
        ],
    },
    {
        "bucket": "EXAM_SCHEDULING",
        "title": "Exam scheduling issue",
        "type": "normal",
        "categoryHints": ["academics", "examination"],
        "phrases": ["exam schedule", "exam timing", "date sheet", "exam gap", "back to back exam", "exam timetable"],
    },
    {
        "bucket": "ACADEMIC_ASSESSMENT",
        "title": "Academic assessment clarity issue",
        "type": "normal",
        "categoryHints": ["academics"],
        "phrases": ["assessment", "internal exam", "test clarity", "test marks", "evaluation", "rubric"],
    },
    {
        "bucket": "ACADEMIC_WORKLOAD",
        "title": "Academic workload issue",
        "type": "normal",
        "categoryHints": ["academics"],
        "phrases": [
            "exam load",
            "academic load",
            "workload",
            "load feels high",
            "too much load",
            "study pressure",
        ],
    },
    {
        "bucket": "ACADEMIC_ASSIGNMENT",
        "title": "Assignment scheduling issue",
        "type": "normal",
        "categoryHints": ["academics"],
        "phrases": ["assignment", "assignments", "uploaded late", "less time", "submission"],
    },
    {
        "bucket": "ACADEMIC_COURSE_CONTENT",
        "title": "Course content clarity issue",
        "type": "normal",
        "categoryHints": ["academics"],
        "phrases": ["course", "course content", "syllabus", "content", "module", "curriculum"],
    },
    {
        "bucket": "MESS_HYGIENE_AVAILABILITY",
        "title": "Mess hygiene and food availability issue",
        "type": "normal",
        "categoryHints": ["mess", "food mess", "hostel"],
        "phrases": ["mess", "food", "hygiene", "cleanliness", "clean", "insects", "quantity", "gets over", "serving", "dinner", "lunch", "hostel mess", "plates"],
    },
    {
        "bucket": "HOSTEL_FACILITY",
        "title": "Hostel facility issue",
        "type": "normal",
        "categoryHints": ["hostel"],
        "phrases": ["hostel", "hostel room", "hostel corridor", "hostel gate", "hostel facilities", "hostel maintenance", "hostel water"],
    },
    {
        "bucket": "MEDICAL_ROOM",
        "title": "Medical room support issue",
        "type": "normal",
        "categoryHints": ["medical", "health", "campus"],
        "phrases": ["medical room", "first aid", "doctor", "nurse", "health room", "medicine not available", "ambulance"],
    },
    {
        "bucket": "CANTEEN_SERVICE",
        "title": "Canteen service issue",
        "type": "normal",
        "categoryHints": ["canteen"],
        "phrases": ["canteen", "queue", "billing", "food options", "counter"],
    },
    {
        "bucket": "PLACEMENT_ACCESS",
        "title": "Placement access issue",
        "type": "normal",
        "categoryHints": ["placements", "placement"],
        "phrases": ["placement", "placements", "drive", "eligibility", "shortlisting", "company"],
    },
    {
        "bucket": "FEST_DURATION",
        "title": "Fest duration issue",
        "type": "normal",
        "categoryHints": ["extracurricular"],
        "phrases": ["fest", "fests", "event", "events", "rushed"],
    },
    {
        "bucket": "SPORTS_EQUIPMENT",
        "title": "Sports item availability issue",
        "type": "normal",
        "categoryHints": ["sports", "sports campus", "sports and campus", "extracurricular"],
        "phrases": ["sports item", "sports items", "item availability", "equipment", "badminton", "football", "racket", "ground booking", "practice time", "sports room"],
    },
    {
        "bucket": "SPORTS_ACCESS",
        "title": "Sports facility timing issue",
        "type": "normal",
        "categoryHints": ["sports", "sports campus", "sports and campus", "campus"],
        "phrases": ["sports facilities", "timings are limited", "limited timings", "practice timing", "practice timings"],
    },
    {
        "bucket": "CAMPUS_LIGHTING",
        "title": "Campus lighting issue",
        "type": "normal",
        "categoryHints": ["sports campus", "sports and campus", "campus", "safety"],
        "phrases": ["lighting", "lights", "street lights", "dark area", "not working at night"],
    },
    {
        "bucket": "CLUB_PARTICIPATION",
        "title": "Campus activity planning issue",
        "type": "normal",
        "categoryHints": ["sports campus", "sports and campus", "extracurricular", "campus"],
        "phrases": [
            "club",
            "clubs",
            "participation",
            "participate",
            "event",
            "events",
            "event slots",
            "extracurricular",
            "activities",
        ],
    },
    {
        "bucket": "TRANSPORT_SERVICE",
        "title": "Transport service issue",
        "type": "normal",
        "categoryHints": ["transport", "bus"],
        "phrases": ["bus", "bus timing", "bus route", "pickup", "drop point", "transport", "late bus", "overcrowded bus"],
    },
    {
        "bucket": "LIBRARY_ACCESS",
        "title": "Library access issue",
        "type": "normal",
        "categoryHints": ["library"],
        "phrases": ["library", "reading room", "book availability", "books not available", "library seating", "library ac", "library timing"],
    },
    {
        "bucket": "SCHOLARSHIP_SUPPORT",
        "title": "Scholarship support issue",
        "type": "normal",
        "categoryHints": ["administration", "scholarship"],
        "phrases": ["scholarship", "scholarship form", "fee reimbursement", "financial aid", "documents for scholarship"],
    },
    {
        "bucket": "SECURITY_GUARD_SUPPORT",
        "title": "Security support issue",
        "type": "normal",
        "categoryHints": ["security", "campus", "safety"],
        "phrases": ["security guard", "guard absent", "entry gate", "gate checking", "security not present"],
    },
    {
        "bucket": "PROJECTOR",
        "title": "Projector issue",
        "type": "normal",
        "categoryHints": ["infrastructure", "classroom", "academics"],
        "phrases": ["projector"],
    },
    {
        "bucket": "WIFI",
        "title": "Wi-Fi connectivity issue",
        "type": "normal",
        "phrases": ["wifi", "internet", "network", "connectivity", "access point"],
    },
    {
        "bucket": "LAB_EQUIPMENT",
        "title": "Lab equipment issue",
        "type": "normal",
        "categoryHints": ["infrastructure", "labs", "lab"],
        "phrases": ["lab", "labs", "lab equipment", "equipment availability", "equipment", "components", "mouse", "system", "practical"],
    },
    {
        "bucket": "WASHROOM_MAINTENANCE",
        "title": "Washroom maintenance issue",
        "type": "normal",
        "categoryHints": ["infrastructure", "hostel"],
        "phrases": ["washroom", "toilet", "fittings"],
    },
    {
        "bucket": "AC_VENTILATION",
        "title": "AC and ventilation issue",
        "type": "normal",
        "categoryHints": ["infrastructure", "classroom", "library", "lab"],
        "phrases": ["ac not working", "air conditioning", "ventilation", "suffocation", "fans not working", "room is too hot"],
    },
    {
        "bucket": "CLASSROOM_MAINTENANCE",
        "title": "Classroom maintenance issue",
        "type": "normal",
        "categoryHints": ["infrastructure", "academics"],
        "phrases": ["classroom", "benches", "fan", "maintenance", "room"],
    },
    {
        "bucket": "ADMINISTRATION",
        "title": "Administration service issue",
        "type": "normal",
        "categoryHints": ["administration"],
        "phrases": ["fee counter", "certificate", "office", "documentation", "admin"],
    },
]

POSITIVE_WORDS = {
    "good",
    "excellent",
    "helpful",
    "clean",
    "supportive",
    "improved",
    "great",
    "clear",
    "positive",
    "useful",
    "decent",
    "smooth",
    "well",
    "satisfied",
}

ISSUE_LANGUAGE_WORDS = {
    "affected",
    "availability",
    "broken",
    "cannot",
    "delay",
    "delayed",
    "dirty",
    "faster",
    "gap",
    "gaps",
    "improve",
    "improvement",
    "inconsistent",
    "issue",
    "less time",
    "limited",
    "load",
    "overload",
    "pressure",
    "heavy",
    "missing",
    "need",
    "needed",
    "needs",
    "not",
    "overlap",
    "poor",
    "problem",
    "repair",
    "should",
    "slow",
    "unavailable",
    "unclear",
    "unfair",
    "worst",
}

STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "very",
    "from",
    "are",
    "was",
    "were",
    "have",
    "has",
    "not",
    "but",
    "can",
    "our",
    "student",
    "students",
    "college",
    "campus",
    "feedback",
    "issue",
    "problem",
}

GENERIC_LOW_INFORMATION = {
    "good",
    "bad",
    "nice",
    "ok",
    "okay",
    "excellent",
    "average",
    "satisfied",
    "unsatisfied",
    "no problem",
    "nothing",
    "none",
    "na",
    "n a",
}

OUT_OF_CONTEXT_HINTS = {
    "cricket",
    "movie",
    "phone battery",
    "weather",
    "traffic",
    "pizza coupon",
    "shopping",
}

ACTIONABLE_CONTEXT_WORDS = {
    "academic",
    "assignment",
    "assessment",
    "canteen",
    "class",
    "classroom",
    "course",
    "doubt",
    "exam",
    "faculty",
    "fest",
    "fests",
    "food",
    "hostel",
    "hygiene",
    "infrastructure",
    "lab",
    "library",
    "mess",
    "placement",
    "placements",
    "projector",
    "ragging",
    "safety",
    "semester",
    "sports",
    "teacher",
    "teaching",
    "subject",
    "washroom",
    "wifi",
    "wi-fi",
}

SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = SERVICE_ROOT / "data"
CORRECTIONS_PATH = DATA_DIR / "human_corrections.jsonl"


def load_env_files() -> None:
    backend_root = SERVICE_ROOT.parent
    for env_path in (backend_root / ".env", SERVICE_ROOT / ".env"):
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_files()


class FeedbackItem(BaseModel):
    id: str
    categoryId: str
    categoryName: str
    questionId: str
    questionText: str
    rating: int
    comment: str | None = None
    departmentCode: str | None = None
    semesterNumber: int | None = None
    weight: int = 1


class GrievanceItem(BaseModel):
    id: str
    category: str
    title: str
    description: str
    severity: str
    status: str
    safetyFlag: bool = False
    isAnonymous: bool = False
    departmentCode: str | None = None


class Term(BaseModel):
    id: str
    name: str


class AnalysisRequest(BaseModel):
    term: Term
    feedback: list[FeedbackItem] = Field(default_factory=list)
    grievances: list[GrievanceItem] = Field(default_factory=list)


class HumanCorrection(BaseModel):
    reportId: str | None = None
    sourceId: str | None = None
    correctionType: Literal[
        "THEME",
        "SENTIMENT",
        "PRIORITY",
        "QUALITY",
        "MERGE",
        "OTHER",
    ] = "OTHER"
    originalValue: str | None = None
    correctedValue: str
    note: str | None = None
    reviewer: str | None = None


app = FastAPI(title="EduPulse AI Service", version="0.1.0")

_sentiment_pipeline = None
_embedding_model = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/models")
def models() -> dict[str, Any]:
    return model_stack_metadata()


@app.post("/human-feedback")
def record_human_feedback(correction: HumanCorrection) -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    record = {
        **correction.model_dump(),
        "recordedAt": datetime.now(timezone.utc).isoformat(),
    }
    with CORRECTIONS_PATH.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record) + "\n")
    return {"status": "RECORDED", "correction": record}


@app.get("/human-feedback/summary")
def human_feedback_summary() -> dict[str, Any]:
    if not CORRECTIONS_PATH.exists():
        return {"totalCorrections": 0, "byType": {}, "latest": []}

    rows = [
        json.loads(line)
        for line in CORRECTIONS_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    return {
        "totalCorrections": len(rows),
        "byType": dict(Counter(row.get("correctionType", "OTHER") for row in rows)),
        "latest": rows[-5:],
    }


@app.post("/analyze")
def analyze(payload: AnalysisRequest) -> dict[str, Any]:
    started_at = time.perf_counter()
    total_feedback_count = weighted_feedback_count(payload.feedback)
    quality = quality_filter(payload.feedback)
    useful_feedback = quality["useful"]
    quality_valid_feedback = [
        item for item in payload.feedback if item.id not in quality["rejectedIds"]
    ]
    feedback_docs = build_feedback_documents(useful_feedback, quality["weights"])
    grievance_docs = build_grievance_documents(payload.grievances)
    documents = feedback_docs + grievance_docs

    if len(documents) <= 20:
        sentiment_by_doc = {
            doc["id"]: lexicon_sentiment(doc["text"], int(doc.get("rating", 3)))
            for doc in documents
        }
        cluster_result = {
            "labels": [-1 for _ in documents],
            "metadata": {
                "clusterer": "small_signal_passthrough",
                "embeddingModel": None,
                "clusterCount": len(documents),
                "noiseCount": 0,
            },
        }
    else:
        sentiment_by_doc = classify_sentiments(documents)
        cluster_result = None
    themes = build_themes(documents, sentiment_by_doc, cluster_result)
    category_themes = build_category_themes(quality_valid_feedback, useful_feedback)
    grievance_theme = build_grievance_theme(payload.grievances)

    all_themes = themes
    if grievance_theme:
        all_themes.insert(0, grievance_theme)

    all_themes = dedupe_themes(all_themes)
    has_gemini_key = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    gemini_reasoning = (
        gemini_reasoning_layer(
            term_name=payload.term.name,
            themes=all_themes,
            quality=quality,
            feedback_count=total_feedback_count,
            grievance_count=len(payload.grievances),
        )
        if has_gemini_key or len(documents) > 20
        else small_signal_reasoning_layer(
            term_name=payload.term.name,
            themes=all_themes,
            quality=quality,
            feedback_count=total_feedback_count,
            grievance_count=len(payload.grievances),
        )
    )
    gemini_reasoning = merge_local_ultra_concerns(gemini_reasoning, all_themes)
    priority_denominator = priority_comment_denominator(quality)
    all_themes = apply_reasoning_priorities(
        all_themes,
        gemini_reasoning,
        priority_denominator,
    )
    all_themes = apply_reasoning_issue_details(all_themes, gemini_reasoning)
    gemini_reasoning = sync_reasoning_with_final_themes(
        gemini_reasoning,
        all_themes,
        priority_denominator,
    )
    visible_themes = sorted(
        exclude_ultra_concerning_themes(all_themes, gemini_reasoning),
        key=lambda theme: (
            priority_rank(theme["priority"]),
            int(theme.get("mentionCount", 0)),
            extract_theme_confidence(theme),
        ),
        reverse=True,
    )
    actions = build_actions(visible_themes)
    narrative = generate_report_narrative(
        term_name=payload.term.name,
        themes=visible_themes,
        actions=actions,
        quality=quality,
        feedback_count=total_feedback_count,
        grievance_count=len(payload.grievances),
        reasoning=gemini_reasoning,
    )
    critical_count = sum(1 for theme in visible_themes if theme["priority"] == "CRITICAL")
    negative_count = sum(
        1
        for theme in visible_themes
        if theme["sentiment"] in {"NEGATIVE", "CRITICAL"}
    )
    processing_ms = int((time.perf_counter() - started_at) * 1000)

    return {
        "title": f"{payload.term.name} EduPulse AI intelligence report",
        "summary": narrative["executiveSummary"],
        "confidence": calculate_confidence(
            total_inputs=total_feedback_count,
            useful_comments=quality["summary"]["usefulSignalComments"],
            duplicate_count=quality["duplicateCount"],
            theme_count=len(visible_themes),
        ),
        "inputCount": total_feedback_count,
        "lowSampleFlag": total_feedback_count < 20,
        "duplicateCount": quality["duplicateCount"],
        "rawJson": {
            "engine": "edupulse-ai-service",
            "modelMode": model_mode(),
            "modelStack": model_stack_metadata(),
            "qualityChecks": quality["summary"],
            "engineBenchmark": {
                "processingMs": processing_ms,
                "responsesPerSecond": round(total_feedback_count / max(processing_ms / 1000, 0.001), 2),
                "documentsClustered": len(documents),
                "themesGenerated": len(visible_themes),
                "ultraConcerningThemes": len(gemini_reasoning.get("ultraConcerningIssues", [])),
                "actionsGenerated": len(actions),
                "criticalThemes": critical_count,
                "negativeThemes": negative_count,
            },
            "sentimentBreakdown": sentiment_breakdown(useful_feedback, quality["weights"]),
            "categorySignals": category_themes,
            "clusterDiagnostics": (
                cluster_result["metadata"]
                if cluster_result
                else {
                    "clusterer": "taxonomy_first_then_unknown_clustering",
                    "embeddingModel": embedding_model_name(),
                    "clusterCount": len(visible_themes),
                    "noiseCount": 0,
                }
            ),
            "reportNarrative": narrative,
            "geminiReasoning": gemini_reasoning,
            "humanCorrectionLoop": {
                "enabled": True,
                "endpoint": "/human-feedback",
                "storedCorrections": human_feedback_summary()["totalCorrections"],
            },
            "pipeline": [
                "rule_and_anomaly_quality_filter",
                "roberta_or_lexicon_sentiment",
                "institutional_issue_taxonomy",
                "entity_extraction",
                "safety_guardrail_engine",
                "semantic_clustering_for_unknowns",
                "priority_risk_scoring",
                "gemini_reasoning_on_issue_clusters",
                "structured_report_generation",
                "human_correction_loop",
            ],
        },
        "themes": visible_themes,
        "actions": actions,
    }


def feedback_weight(item: FeedbackItem) -> int:
    try:
        return max(1, int(item.weight or 1))
    except (TypeError, ValueError):
        return 1


def weighted_feedback_count(feedback: list[FeedbackItem]) -> int:
    return sum(feedback_weight(item) for item in feedback)


def quality_filter(feedback: list[FeedbackItem]) -> dict[str, Any]:
    seen: dict[str, FeedbackItem] = {}
    weights: dict[str, int] = {}
    useful: list[FeedbackItem] = []
    duplicate_count = 0
    duplicate_groups: dict[str, dict[str, Any]] = {}
    rejected = Counter()
    rejected_ids: set[str] = set()
    rejected_examples: list[dict[str, Any]] = []

    for item in feedback:
        item_weight = feedback_weight(item)
        raw_comment = (item.comment or "").strip()
        comment = normalize_text(raw_comment)
        if not comment:
            continue

        reason = reject_reason(comment)
        fingerprint = f"{item.categoryId}:{comment}"

        if reason:
            rejected[reason] += item_weight
            rejected_ids.add(item.id)
            if len(rejected_examples) < 8:
                rejected_examples.append(
                    {
                        "comment": raw_comment[:180],
                        "topic": item.categoryName,
                        "question": item.questionText,
                        "source": source_label(item),
                        "reason": reason,
                        "decision": "Ignored from theme analysis",
                    }
                )
            continue

        if fingerprint in seen:
            duplicate_count += item_weight
            first_item = seen[fingerprint]
            weights[first_item.id] = weights.get(first_item.id, 1) + item_weight
            group = duplicate_groups.setdefault(
                fingerprint,
                {
                    "comment": first_item.comment or "",
                    "topic": first_item.categoryName,
                    "repeated": 1,
                    "decision": "Grouped as repeated signal",
                },
            )
            group["repeated"] = weights[first_item.id]
            continue

        seen[fingerprint] = item
        weights[item.id] = item_weight
        if item_weight > 1:
            duplicate_count += item_weight - 1
            duplicate_groups[fingerprint] = {
                "comment": item.comment or "",
                "topic": item.categoryName,
                "repeated": item_weight,
                "decision": "Grouped as repeated signal",
            }
        useful.append(item)

    duplicate_examples = sorted(
        duplicate_groups.values(),
        key=lambda item: int(item["repeated"]),
        reverse=True,
    )[:8]
    useful_signal_comments = len(useful) + duplicate_count
    low_quality_rejected_count = sum(rejected.values())

    return {
        "useful": useful,
        "weights": weights,
        "rejectedIds": rejected_ids,
        "duplicateCount": duplicate_count,
        "summary": {
            "totalComments": sum(feedback_weight(item) for item in feedback if item.comment),
            "usefulComments": useful_signal_comments,
            "usefulSignalComments": useful_signal_comments,
            "uniqueUsefulComments": len(useful),
            "duplicateCount": duplicate_count,
            "lowQualityRejectedCount": low_quality_rejected_count,
            "rejected": dict(rejected),
            "rejectedExamples": rejected_examples,
            "duplicateExamples": duplicate_examples,
        },
    }


def reject_reason(text: str) -> str | None:
    words = text.split()
    if len(text) < 8 or len(words) < 2:
        return "too_short"
    if text in GENERIC_LOW_INFORMATION:
        return "too_generic"
    if any(hint in text for hint in OUT_OF_CONTEXT_HINTS):
        return "out_of_context"
    if re.search(r"(.)\1{5,}", text):
        return "repeated_characters"
    if len(set(words)) <= 2 and len(words) >= 5:
        return "repeated_words"
    if not re.search(r"[a-zA-Z]{3,}", text):
        return "random_text"
    if len(words) >= 6 and (len(set(words)) / len(words)) < 0.35:
        return "low_lexical_diversity"
    if (
        len(words) <= 4
        and not any(word in text for word in ACTIONABLE_CONTEXT_WORDS)
        and not has_ultra_concern_language(text)
        and not any(word in text for word in NEGATIVE_WORDS)
    ):
        return "out_of_context"
    if (
        any(word in text for word in {"trash", "useless", "terrible", "worst"})
        and not any(word in text for word in ACTIONABLE_CONTEXT_WORDS)
    ):
        return "extreme_low_information"
    return None


def source_label(item: FeedbackItem) -> str:
    parts = []
    if item.departmentCode:
        parts.append(f"{item.departmentCode} student")
    else:
        parts.append("Student")
    if item.semesterNumber:
        parts.append(f"Semester {item.semesterNumber}")
    return ", ".join(parts)


def build_feedback_documents(
    feedback: list[FeedbackItem], weights: dict[str, int] | None = None
) -> list[dict[str, Any]]:
    docs = []
    for item in feedback:
        docs.append(
            {
                "id": item.id,
                "source": "feedback",
                "text": item.comment or "",
                "categoryId": item.categoryId,
                "categoryName": item.categoryName,
                "rating": item.rating,
                "departmentCode": item.departmentCode,
                "semesterNumber": item.semesterNumber,
                "weight": (weights or {}).get(item.id, 1),
            }
        )
    return docs


def build_grievance_documents(grievances: list[GrievanceItem]) -> list[dict[str, Any]]:
    docs = []
    for item in grievances:
        docs.append(
            {
                "id": item.id,
                "source": "grievance",
                "text": f"{item.title}. {item.description}",
                "categoryId": None,
                "categoryName": item.category,
                "rating": 1 if item.severity in {"HIGH", "CRITICAL"} else 2,
                "severity": item.severity,
                "safetyFlag": item.safetyFlag,
                "departmentCode": item.departmentCode,
                "weight": 1,
            }
        )
    return docs


def classify_sentiments(documents: list[dict[str, Any]]) -> dict[str, Sentiment]:
    if not documents:
        return {}

    hf = get_sentiment_pipeline()
    if hf:
        return classify_with_roberta(documents, hf)

    return {doc["id"]: lexicon_sentiment(doc["text"], doc.get("rating", 3)) for doc in documents}


def classify_with_roberta(documents: list[dict[str, Any]], hf: Any) -> dict[str, Sentiment]:
    results: dict[str, Sentiment] = {}
    batch_size = 64
    for start in range(0, len(documents), batch_size):
        batch = documents[start : start + batch_size]
        outputs = hf([doc["text"][:512] for doc in batch], truncation=True)
        for doc, output in zip(batch, outputs):
            label = str(output["label"]).lower()
            text = normalize_text(doc["text"])
            if has_critical_language(text) or doc.get("safetyFlag"):
                results[doc["id"]] = "CRITICAL"
            elif "negative" in label or label.endswith("_0"):
                results[doc["id"]] = "NEGATIVE"
            elif "positive" in label or label.endswith("_2"):
                results[doc["id"]] = "POSITIVE"
            else:
                results[doc["id"]] = "NEUTRAL"
    return results


def should_create_issue_theme(doc: dict[str, Any], sentiment: Sentiment) -> bool:
    text = normalize_text(str(doc.get("text", "")))
    if not text:
        return False
    if has_critical_language(text) or sentiment == "CRITICAL":
        return True
    if is_positive_only_comment(text):
        return False
    if sentiment == "NEGATIVE":
        return True
    if int(doc.get("rating", 3)) <= 2:
        return has_issue_language(text) or bool(
            match_issue_taxonomy(text, str(doc.get("categoryName", "")))
        )
    return False


def has_issue_language(text: str) -> bool:
    clean = normalize_text(text)
    return (
        any(word in clean for word in ISSUE_LANGUAGE_WORDS)
        or any(word in clean for word in NEGATIVE_WORDS)
        or has_ultra_concern_language(clean)
    )


def is_positive_only_comment(text: str) -> bool:
    clean = normalize_text(text)
    if has_issue_language(clean) or has_ultra_concern_language(clean):
        return False
    positive_hits = sum(1 for word in POSITIVE_WORDS if word in clean)
    negative_hits = sum(1 for word in NEGATIVE_WORDS if word in clean)
    return positive_hits > 0 and negative_hits == 0


def match_issue_taxonomy(text: str, category_name: str = "") -> dict[str, Any] | None:
    clean_text = normalize_text(text)
    clean_category = normalize_text(category_name)
    for rule in ISSUE_TAXONOMY:
        category_hints = [normalize_text(str(item)) for item in rule.get("categoryHints", [])]
        if category_hints and clean_category and not any(
            hint in clean_category or clean_category in hint for hint in category_hints
        ):
            text_only_match = False
        else:
            text_only_match = True
        if not text_only_match and str(rule.get("type")) != "urgent":
            continue
        if contains_any_phrase(clean_text, rule.get("phrases", [])):
            return rule
    return None


def contains_any_phrase(text: str, phrases: list[str] | tuple[str, ...] | set[str]) -> bool:
    return any(normalize_text(str(phrase)) in text for phrase in phrases if str(phrase).strip())


def taxonomy_bucket_key(doc: dict[str, Any]) -> str | None:
    match = match_issue_taxonomy(doc.get("text", ""), doc.get("categoryName", ""))
    if not match:
        return None
    return str(match["bucket"])


def taxonomy_title_from_docs(docs: list[dict[str, Any]]) -> str | None:
    matches = [
        match_issue_taxonomy(doc.get("text", ""), doc.get("categoryName", ""))
        for doc in docs
    ]
    valid = [match for match in matches if match]
    if not valid:
        aggregate_match = match_issue_taxonomy(
            " ".join(doc.get("text", "") for doc in docs),
            Counter(doc.get("categoryName", "") for doc in docs).most_common(1)[0][0],
        )
        return str(aggregate_match["title"]) if aggregate_match else None
    bucket = Counter(str(match["bucket"]) for match in valid).most_common(1)[0][0]
    for match in valid:
        if str(match["bucket"]) == bucket:
            return str(match["title"])
    return None


def taxonomy_metadata_from_docs(docs: list[dict[str, Any]]) -> dict[str, Any] | None:
    matches = [
        match_issue_taxonomy(doc.get("text", ""), doc.get("categoryName", ""))
        for doc in docs
    ]
    valid = [match for match in matches if match]
    if not valid:
        return None
    bucket = Counter(str(match["bucket"]) for match in valid).most_common(1)[0][0]
    selected = next(match for match in valid if str(match["bucket"]) == bucket)
    matched_count = sum(1 for match in valid if str(match["bucket"]) == bucket)
    return {
        "bucket": selected["bucket"],
        "title": selected["title"],
        "type": selected.get("type", "normal"),
        "matchedDocuments": matched_count,
        "coverage": round(matched_count / max(len(docs), 1), 2),
    }


def extract_entities_from_docs(docs: list[dict[str, Any]]) -> dict[str, Any]:
    raw_text = " ".join(str(doc.get("text", "")) for doc in docs)
    clean = normalize_text(raw_text)
    locations = set()
    location_patterns = [
        r"\bab\s*\d+\s*room\s*\d+\b",
        r"\bab\s*\d+\s*building\b",
        r"\bab\s*\d+\b",
        r"\bblock\s+[a-z]\b",
        r"\broom\s*\d+\b",
        r"\b(?:first|second|third|fourth|1st|2nd|3rd|4th)\s+year\s+hostel\s+mess\b",
        r"\bhostel\s+corridor\b",
        r"\bhostel\s+mess\b",
        r"\bhostel\b",
        r"\bcs\s*ds\s+campus\b",
        r"\bcsds\s+campus\b",
        r"\bplayground\b",
        r"\bcanteen\b",
        r"\blibrary\b",
        r"\blab\b",
        r"\bwashroom\b",
        r"\bparking\s+area\b",
        r"\bcampus\s+gate\b",
    ]
    for pattern in location_patterns:
        for match in re.finditer(pattern, clean):
            locations.add(pretty_entity(match.group(0)))

    people = {
        match.group(0).strip()
        for match in re.finditer(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b", raw_text)
        if match.group(0).strip().lower() not in {"Computer Science", "Information Technology"}
    }
    semesters = {
        pretty_entity(match.group(0))
        for match in re.finditer(
            r"\b(?:semester\s*\d+|[1-8](?:st|nd|rd|th)\s+semester|(?:first|second|third|fourth)\s+year|[1-4](?:st|nd|rd|th)\s+year)\b",
            clean,
        )
    }
    departments = extract_departments_from_text(raw_text)

    return {
        "departments": departments,
        "locations": sorted(locations)[:8],
        "people": sorted(people)[:8],
        "semesters": sorted(semesters)[:8],
    }


def pretty_entity(value: str) -> str:
    replacements = {
        "ab": "AB",
        "cs": "CS",
        "ds": "DS",
        "cs ds": "CS DS",
        "csds": "CSDS",
    }
    words = []
    for word in value.split():
        lowered = word.lower()
        if re.fullmatch(r"ab\d+", lowered):
            words.append(lowered.upper())
        elif lowered in replacements:
            words.append(replacements[lowered])
        elif re.fullmatch(r"\d+(?:st|nd|rd|th)?", lowered):
            words.append(lowered)
        else:
            words.append(word.capitalize())
    return " ".join(words)


def issue_confidence_from_docs(
    docs: list[dict[str, Any]],
    taxonomy: dict[str, Any] | None,
    entities: dict[str, Any],
    sentiment: Sentiment,
) -> int:
    score = 0.52
    if taxonomy:
        score += 0.25 + min(float(taxonomy.get("coverage", 0)), 1.0) * 0.08
    else:
        score -= 0.12
    weighted_count = sum(int(doc.get("weight", 1)) for doc in docs)
    if weighted_count >= 2:
        score += 0.06
    if weighted_count >= 5:
        score += 0.05
    if weighted_count >= 25:
        score += 0.04
    if any(entities.get(key) for key in ("locations", "people", "departments", "semesters")):
        score += 0.05
    if sentiment == "CRITICAL":
        score += 0.04
    elif sentiment == "NEGATIVE":
        score += 0.02
    return int(round(max(0.35, min(0.97, score)) * 100))


def build_themes(
    documents: list[dict[str, Any]],
    sentiment_by_doc: dict[str, Sentiment],
    cluster_result: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    if len(documents) < 2:
        if not documents:
            return []
        sentiment = sentiment_by_doc.get(documents[0]["id"], "NEUTRAL")
        if should_create_issue_theme(documents[0], sentiment):
            return [build_theme_from_docs([documents[0]], sentiment, cluster_result)]
        return []

    taxonomy_buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    unknown_docs: list[dict[str, Any]] = []
    for doc in documents:
        sentiment = sentiment_by_doc.get(doc["id"], "NEUTRAL")
        if not should_create_issue_theme(doc, sentiment):
            continue
        key = taxonomy_bucket_key(doc)
        if key:
            taxonomy_buckets[key].append(doc)
        else:
            unknown_docs.append(doc)

    themes = []
    for bucket_docs in taxonomy_buckets.values():
        sentiments = [sentiment_by_doc.get(doc["id"], "NEUTRAL") for doc in bucket_docs]
        themes.append(
            build_theme_from_docs(
                bucket_docs,
                strongest_sentiment(sentiments),
                cluster_result,
            )
        )

    if not unknown_docs:
        return themes

    if len(unknown_docs) <= 250:
        buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for doc in unknown_docs:
            buckets[title_from_docs([doc])].append(doc)
        for bucket_docs in buckets.values():
            sentiments = [
                sentiment_by_doc.get(doc["id"], "NEUTRAL") for doc in bucket_docs
            ]
            themes.append(
                build_theme_from_docs(
                    bucket_docs,
                    strongest_sentiment(sentiments),
                    cluster_result,
                )
            )
        return themes

    labels = (
        cluster_result["labels"]
        if cluster_result
        else cluster_documents([doc["text"] for doc in unknown_docs])
    )
    clusters: dict[int, list[dict[str, Any]]] = defaultdict(list)
    noise_docs: list[dict[str, Any]] = []
    for label, doc in zip(labels, unknown_docs):
        if int(label) == -1:
            noise_docs.append(doc)
            continue
        clusters[int(label)].append(doc)

    themes = []
    for doc in noise_docs:
        sentiment = sentiment_by_doc.get(doc["id"], "NEUTRAL")
        if sentiment in {"NEGATIVE", "CRITICAL"} or doc.get("rating", 3) <= 2:
            themes.append(build_theme_from_docs([doc], sentiment, cluster_result))

    for cluster_docs in clusters.values():
        sentiments = [sentiment_by_doc.get(doc["id"], "NEUTRAL") for doc in cluster_docs]
        sentiment = strongest_sentiment(sentiments)
        if len(cluster_docs) < 2:
            doc = cluster_docs[0]
            if not should_create_issue_theme(doc, sentiment):
                continue
            themes.append(build_theme_from_docs(cluster_docs, sentiment, cluster_result))
            continue
        if sentiment in {"POSITIVE", "NEUTRAL"}:
            continue
        themes.append(build_theme_from_docs(cluster_docs, sentiment, cluster_result))

    return themes


def build_theme_from_docs(
    cluster_docs: list[dict[str, Any]],
    sentiment: Sentiment,
    cluster_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
    weighted_mentions = sum(int(doc.get("weight", 1)) for doc in cluster_docs)
    category_counter = Counter(doc["categoryName"] for doc in cluster_docs)
    department_counter = Counter(doc.get("departmentCode") or "UNKNOWN" for doc in cluster_docs)
    taxonomy = taxonomy_metadata_from_docs(cluster_docs)
    entities = extract_entities_from_docs(cluster_docs)
    title = str(taxonomy["title"]) if taxonomy else title_from_docs(cluster_docs)
    if taxonomy and taxonomy.get("type") == "urgent":
        sentiment = "CRITICAL"
    priority = "CRITICAL" if taxonomy and taxonomy.get("type") == "urgent" else priority_from_docs(cluster_docs, sentiment)
    confidence = issue_confidence_from_docs(cluster_docs, taxonomy, entities, sentiment)
    return {
        "categoryId": most_common_category_id(cluster_docs),
        "title": title,
        "summary": (
            f"{weighted_mentions} feedback comment(s) mention {title.lower()}. "
            f"Most common category: {category_counter.most_common(1)[0][0]}."
        ),
        "sentiment": sentiment,
        "priority": priority,
        "mentionCount": weighted_mentions,
        "evidence": {
            "sampleComments": [doc["text"] for doc in cluster_docs[:3]],
            "departments": dict(department_counter),
            "priorityScore": priority_score(cluster_docs, sentiment),
            "uniqueCommentCount": len(cluster_docs),
            "taxonomy": taxonomy,
            "extractedEntities": entities,
            "issueConfidence": confidence,
            "reviewStatus": "HIGH_CONFIDENCE" if confidence >= 80 else "NEEDS_REVIEW",
            "clusterer": (
                cluster_result["metadata"]["clusterer"]
                if cluster_result
                else "unknown"
            ),
        },
        "actionTitle": f"Investigate and resolve {title.lower()}",
        "kpi": f"Reduce {title.lower()} mentions in the next feedback cycle",
    }


def build_category_themes(
    all_feedback: list[FeedbackItem], useful_feedback: list[FeedbackItem]
) -> list[dict[str, Any]]:
    buckets: dict[str, list[FeedbackItem]] = defaultdict(list)
    useful_by_category: dict[str, list[FeedbackItem]] = defaultdict(list)

    for item in all_feedback:
        buckets[item.categoryId].append(item)

    for item in useful_feedback:
        useful_by_category[item.categoryId].append(item)

    themes = []
    for category_id, items in buckets.items():
        ratings = [item.rating for item in items]
        if not ratings:
            continue
        average = sum(ratings) / len(ratings)
        low_count = sum(1 for rating in ratings if rating <= 2)
        low_ratio = low_count / len(ratings)
        comments = [item.comment or "" for item in useful_by_category[category_id]][:3]
        category_name = items[0].categoryName
        sentiment = category_sentiment(average, low_ratio, comments)
        priority = category_priority(sentiment, low_ratio, len(items), comments)
        themes.append(
            {
                "categoryId": category_id,
                "title": f"{category_name} satisfaction signal",
                "summary": (
                    f"{category_name} average rating is {average:.2f}/4 from "
                    f"{len(items)} response(s). {low_count} response(s) are low rated."
                ),
                "sentiment": sentiment,
                "priority": priority,
                "mentionCount": len(items),
                "evidence": {
                    "averageRating": round(average, 2),
                    "lowRatedResponses": low_count,
                    "sampleComments": comments,
                    "departmentBreakdown": department_satisfaction(items),
                },
                "actionTitle": f"Improve {category_name} satisfaction",
                "kpi": f"Raise {category_name} average rating above 3.2/4",
            }
        )
    return themes


def build_grievance_theme(grievances: list[GrievanceItem]) -> dict[str, Any] | None:
    if not grievances:
        return None
    safety_count = sum(1 for item in grievances if item.safetyFlag or item.severity == "CRITICAL")
    priority: Priority = "CRITICAL" if safety_count else "HIGH"
    return {
        "categoryId": None,
        "title": "Live grievance escalation",
        "summary": (
            f"{len(grievances)} grievance(s) are open for admin review. "
            f"{safety_count} case(s) contain safety or critical signals."
        ),
        "sentiment": "CRITICAL" if safety_count else "NEGATIVE",
        "priority": priority,
        "mentionCount": len(grievances),
        "evidence": {
            "safetyFlagged": safety_count,
            "categories": sorted({item.category for item in grievances}),
            "examples": [
                {"title": item.title, "severity": item.severity, "status": item.status}
                for item in grievances[:3]
            ],
        },
        "actionTitle": "Escalate and resolve urgent grievances",
        "kpi": "Close critical grievances within 48 hours",
    }


def cluster_documents(texts: list[str]) -> list[int]:
    return cluster_documents_with_metadata(texts)["labels"]


def cluster_documents_with_metadata(texts: list[str]) -> dict[str, Any]:
    if len(texts) < 2:
        return {
            "labels": [0 for _ in texts],
            "metadata": {
                "clusterer": "single_cluster",
                "embeddingModel": None,
                "clusterCount": 1 if texts else 0,
                "noiseCount": 0,
            },
        }

    embedding_model = get_embedding_model()
    if embedding_model and np is not None:
        vectors = encode_documents(embedding_model, texts)
        if HDBSCAN is not None and len(texts) >= 6:
            labels = HDBSCAN(
                min_cluster_size=max(2, min(8, int(math.sqrt(len(texts))))),
                min_samples=1,
                metric="euclidean",
            ).fit_predict(vectors).tolist()
            if useful_cluster_count(labels) > 0:
                return {
                    "labels": labels,
                    "metadata": {
                        "clusterer": "hdbscan_density",
                        "embeddingModel": embedding_model_name(),
                        "clusterCount": useful_cluster_count(labels),
                        "noiseCount": sum(1 for label in labels if label == -1),
                    },
                }

        if MiniBatchKMeans is not None:
            cluster_count = choose_cluster_count(len(texts))
            labels = MiniBatchKMeans(
                n_clusters=cluster_count,
                random_state=42,
                batch_size=256,
                n_init="auto",
            ).fit_predict(vectors).tolist()
            return {
                "labels": labels,
                "metadata": {
                    "clusterer": "embedding_minibatch_kmeans",
                    "embeddingModel": embedding_model_name(),
                    "clusterCount": useful_cluster_count(labels),
                    "noiseCount": 0,
                },
            }

    if TfidfVectorizer is not None and MiniBatchKMeans is not None:
        vectors = TfidfVectorizer(max_features=1200, stop_words="english").fit_transform(texts)
        cluster_count = choose_cluster_count(len(texts))
        labels = MiniBatchKMeans(
            n_clusters=cluster_count, random_state=42, batch_size=256, n_init="auto"
        ).fit_predict(vectors).tolist()
        return {
            "labels": labels,
            "metadata": {
                "clusterer": "tfidf_minibatch_kmeans",
                "embeddingModel": None,
                "clusterCount": useful_cluster_count(labels),
                "noiseCount": 0,
            },
        }

    labels = keyword_cluster(texts)
    return {
        "labels": labels,
        "metadata": {
            "clusterer": "keyword_fallback",
            "embeddingModel": None,
            "clusterCount": useful_cluster_count(labels),
            "noiseCount": 0,
        },
    }


def encode_documents(embedding_model: Any, texts: list[str]) -> Any:
    model_name = embedding_model_name().lower()
    prepared = [f"passage: {text}" if "e5" in model_name else text for text in texts]
    return embedding_model.encode(
        prepared,
        batch_size=int(os.getenv("EDUPULSE_EMBEDDING_BATCH_SIZE", "64")),
        normalize_embeddings=True,
    )


def useful_cluster_count(labels: list[int]) -> int:
    return len({label for label in labels if label != -1})


def choose_cluster_count(count: int) -> int:
    return max(2, min(12, int(math.sqrt(count))))


def keyword_cluster(texts: list[str]) -> list[int]:
    labels = []
    keys: dict[str, int] = {}
    for text in texts:
        label_key = top_keyword(text)
        if label_key not in keys:
            keys[label_key] = len(keys)
        labels.append(keys[label_key])
    return labels


def lexicon_sentiment(text: str, rating: int) -> Sentiment:
    clean = normalize_text(text)
    if has_critical_language(clean):
        return "CRITICAL"
    negative_hits = sum(1 for word in NEGATIVE_WORDS if word in clean)
    positive_hits = sum(1 for word in POSITIVE_WORDS if word in clean)
    if rating <= 2 or negative_hits > positive_hits:
        return "NEGATIVE"
    if rating >= 3 and positive_hits >= negative_hits:
        return "POSITIVE"
    return "NEUTRAL"


def category_sentiment(average: float, low_ratio: float, comments: list[str]) -> Sentiment:
    text = normalize_text(" ".join(comments))
    if has_critical_language(text):
        return "CRITICAL"
    if average < 2.6 or low_ratio >= 0.4 or any(word in text for word in NEGATIVE_WORDS):
        return "NEGATIVE"
    if average >= 3.3 and low_ratio < 0.25:
        return "POSITIVE"
    return "NEUTRAL"


def category_priority(
    sentiment: Sentiment, low_ratio: float, mention_count: int, comments: list[str]
) -> Priority:
    text = normalize_text(" ".join(comments))
    if sentiment == "CRITICAL" or has_critical_language(text):
        return "CRITICAL"
    if sentiment == "NEGATIVE" and (low_ratio >= 0.4 or mention_count >= 20):
        return "HIGH"
    if sentiment == "NEGATIVE":
        return "MEDIUM"
    return "LOW"


def priority_from_docs(docs: list[dict[str, Any]], sentiment: Sentiment) -> Priority:
    score = priority_score(docs, sentiment)
    weighted_count = sum(int(doc.get("weight", 1)) for doc in docs) or 1
    safety_weight = sum(
        int(doc.get("weight", 1))
        for doc in docs
        if doc.get("safetyFlag") or has_critical_language(doc.get("text", ""))
    )
    safety_ratio = safety_weight / weighted_count
    if safety_weight >= 2 and safety_ratio >= 0.5 and score >= 5:
        return "CRITICAL"
    if score >= 5:
        return "HIGH"
    if score >= 3:
        return "MEDIUM"
    return "LOW"


def priority_score(docs: list[dict[str, Any]], sentiment: Sentiment) -> float:
    text = normalize_text(" ".join(doc["text"] for doc in docs))
    weighted_count = sum(int(doc.get("weight", 1)) for doc in docs)
    low_rating_count = sum(
        int(doc.get("weight", 1)) for doc in docs if doc.get("rating", 3) <= 2
    )
    safety_count = sum(
        int(doc.get("weight", 1))
        for doc in docs
        if doc.get("safetyFlag") or has_critical_language(doc["text"])
    )
    score = 0.0
    score += min(weighted_count, 200) / 40
    score += min(low_rating_count, 200) * 0.03
    score += min(safety_count, 20) * 2
    score += 3 if sentiment == "CRITICAL" else 2 if sentiment == "NEGATIVE" else 0
    score += 2 if any(word in text for word in CRITICAL_WORDS) else 0
    score += 1 if has_health_risk_language(text) else 0
    return round(score, 2)


def strongest_sentiment(sentiments: list[Sentiment]) -> Sentiment:
    counts = Counter(sentiments)
    if counts["CRITICAL"] >= 2 and counts["CRITICAL"] >= max(counts["NEGATIVE"], counts["POSITIVE"], counts["NEUTRAL"]):
        return "CRITICAL"
    if counts["NEGATIVE"] >= max(counts["POSITIVE"], counts["NEUTRAL"]):
        return "NEGATIVE"
    if counts["POSITIVE"] > counts["NEUTRAL"]:
        return "POSITIVE"
    return "NEUTRAL"


def dedupe_themes(themes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    result = []
    for theme in sorted(themes, key=lambda item: priority_rank(item["priority"]), reverse=True):
        key = normalize_text(theme["title"])
        if key in seen:
            continue
        seen.add(key)
        result.append(theme)
    return result[:40]


def build_actions(themes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    actions = []
    for theme in themes:
        if theme["priority"] not in {"HIGH", "CRITICAL"}:
            continue
        actions.append(
            {
                "title": theme.get("actionTitle") or f"Resolve {theme['title'].lower()}",
                "priority": theme["priority"],
                "timeline": "24-48 hours" if theme["priority"] == "CRITICAL" else "7-14 days",
                "kpi": theme.get("kpi") or f"Reduce {theme['title'].lower()} by next cycle",
            }
        )
    return actions[:6]


def small_signal_reasoning_layer(
    term_name: str,
    themes: list[dict[str, Any]],
    quality: dict[str, Any],
    feedback_count: int,
    grievance_count: int,
) -> dict[str, Any]:
    base = base_issue_priority_scoring_layer(
        term_name=term_name,
        themes=themes,
        quality=quality,
        feedback_count=feedback_count,
        grievance_count=grievance_count,
    )
    ultra = []
    for index, theme in enumerate(themes):
        text = normalize_text(
            f"{theme.get('title', '')} {theme.get('summary', '')} "
            f"{' '.join(extract_theme_evidence_samples(theme))}"
        )
        if is_theme_ultra_concern(theme):
            ultra.append(
                {
                    "id": str(index),
                    "title": theme["title"],
                    "reason": theme["summary"],
                    "detailedSummary": build_plain_issue_summary(theme, extract_theme_evidence_samples(theme)),
                    "mentions": theme["mentionCount"],
                    "source": "small_signal_safety_reasoning",
                }
            )

    return {
        **base,
        "mode": "small_signal_reasoning_layer",
        "provider": "local_small_signal_reasoning",
        "ultraConcerningIssues": collapse_ultra_concerns(ultra)[:8],
    }


def merge_local_ultra_concerns(
    reasoning: dict[str, Any],
    themes: list[dict[str, Any]],
) -> dict[str, Any]:
    existing = filter_valid_ultra_concerns(
        normalize_ultra_concerns(reasoning.get("ultraConcerningIssues", [])),
        themes,
    )
    existing_ids = {str(item.get("id")) for item in existing}
    merged = list(existing)

    for index, theme in enumerate(themes):
        item_id = str(index)
        text = normalize_text(
            f"{theme.get('title', '')} {theme.get('summary', '')} "
            f"{' '.join(extract_theme_evidence_samples(theme))}"
        )
        if item_id in existing_ids or not is_theme_ultra_concern(theme):
            continue
        merged.append(
            {
                "id": item_id,
                "title": theme["title"],
                "reason": theme["summary"],
                "detailedSummary": build_plain_issue_summary(theme, extract_theme_evidence_samples(theme)),
                "mentions": theme["mentionCount"],
                "source": "deterministic_ultra_concern_guard",
            }
        )
        existing_ids.add(item_id)

    return {
        **reasoning,
        "ultraConcerningIssues": collapse_ultra_concerns(merged)[:8],
    }


def exclude_ultra_concerning_themes(
    themes: list[dict[str, Any]],
    reasoning: dict[str, Any],
) -> list[dict[str, Any]]:
    ultra_ids = {
        str(item.get("id"))
        for item in reasoning.get("ultraConcerningIssues", [])
        if isinstance(item, dict)
    }
    visible = []
    for index, theme in enumerate(themes):
        text = normalize_text(
            f"{theme.get('title', '')} {theme.get('summary', '')} "
            f"{' '.join(extract_theme_evidence_samples(theme))}"
        )
        if str(index) in ultra_ids or is_theme_ultra_concern(theme):
            continue
        visible.append(theme)
    return visible


def filter_valid_ultra_concerns(
    concerns: list[dict[str, Any]],
    themes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    valid = []
    for concern in concerns:
        item_id = str(concern.get("id", ""))
        if item_id.isdigit():
            index = int(item_id)
            if 0 <= index < len(themes) and is_theme_ultra_concern(themes[index]):
                valid.append(concern)
            continue
        text = normalize_text(
            f"{concern.get('title', '')} {concern.get('reason', '')} {concern.get('detailedSummary', '')}"
        )
        if ultra_concern_bucket({"title": concern.get("title", ""), "reason": text, "detailedSummary": ""})[0] != "other":
            valid.append(concern)
    return valid


def is_theme_ultra_concern(theme: dict[str, Any]) -> bool:
    taxonomy = extract_theme_taxonomy(theme)
    if taxonomy:
        return taxonomy.get("type") == "urgent"
    text = normalize_text(
        f"{theme.get('title', '')} {theme.get('summary', '')} "
        f"{' '.join(extract_theme_evidence_samples(theme))}"
    )
    return ultra_concern_bucket({"title": theme.get("title", ""), "reason": text, "detailedSummary": ""})[0] != "other"


def collapse_ultra_concerns(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = {}
    order = {
        "harassment": 0,
        "ragging": 1,
        "corruption": 2,
        "weapon_violence": 3,
        "animal_danger": 4,
        "water_contamination": 5,
        "electric_fire": 6,
        "food_poisoning": 7,
        "building_injury": 8,
        "other": 99,
    }

    for item in items:
        key, title = ultra_concern_bucket(item)
        existing = buckets.get(key)
        mentions = int(NumberLike(item.get("mentions", 1)))
        if existing:
            existing["mentions"] = int(existing.get("mentions", 1)) + mentions
            existing["relatedTitles"].append(str(item.get("title", title)))
            continue
        buckets[key] = {
            **item,
            "id": key,
            "title": title,
            "mentions": mentions,
            "relatedTitles": [str(item.get("title", title))],
        }

    collapsed = list(buckets.values())
    for item in collapsed:
        related = item.pop("relatedTitles", [])
        item["detailedSummary"] = build_ultra_concern_detail(item)
        item["evidenceTitles"] = related[:6]
    return sorted(
        collapsed,
        key=lambda item: (order.get(str(item.get("id")), 99), -int(item.get("mentions", 1))),
    )


def build_ultra_concern_detail(item: dict[str, Any]) -> str:
    base = str(
        item.get("detailedSummary")
        or item.get("reason")
        or "A serious concern is present in the feedback."
    ).strip()
    detail = urgent_bucket_detail(str(item.get("id", "other")), int(item.get("mentions", 1)))
    if detail.lower() in base.lower():
        return base
    return f"{base} {detail}".strip()


def urgent_bucket_detail(bucket: str, mentions: int) -> str:
    mention_text = f"{mentions} mention(s)" if mentions > 1 else "One mention"
    details = {
        "harassment": (
            f"{mention_text} describe harassment or physical misconduct. Treat it as confidential, "
            "protect the reporting student's identity, and verify the named faculty, department or place if provided."
        ),
        "ragging": (
            f"{mention_text} describe ragging or bullying. Escalate to the anti-ragging authority and verify "
            "the hostel, classroom or campus area mentioned in the evidence."
        ),
        "corruption": (
            f"{mention_text} point to money misconduct. Verify receipts, event collections, approval records "
            "and the people responsible for handling the funds."
        ),
        "weapon_violence": (
            f"{mention_text} describe weapon, firing, shooting or violence signals. Involve campus security "
            "and verify CCTV, gate logs and witness reports before treating it as a routine feedback issue."
        ),
        "animal_danger": (
            f"{mention_text} describe animal danger on campus. Restrict access to the reported area and ask "
            "security or maintenance to clear and verify the location."
        ),
        "water_contamination": (
            f"{mention_text} describe unsafe or contaminated water. Stop use of the reported source, arrange "
            "safe drinking water and test water quality."
        ),
        "electric_fire": (
            f"{mention_text} describe electric shock, fire, smoke or gas leak risk. Block access to the point "
            "and send maintenance support immediately."
        ),
        "food_poisoning": (
            f"{mention_text} describe food poisoning or sickness. Inspect the food source, preserve evidence "
            "and check whether medical support is needed."
        ),
        "building_injury": (
            f"{mention_text} describe falling plaster, ceiling or structural injury risk. Close the affected "
            "room or area until maintenance verifies it."
        ),
    }
    return details.get(
        bucket,
        f"{mention_text} need senior admin verification because the issue can affect student safety or trust.",
    )


def ultra_concern_bucket(item: dict[str, Any]) -> tuple[str, str]:
    text = normalize_text(
        f"{item.get('title', '')} {item.get('reason', '')} {item.get('detailedSummary', '')}"
    )
    if "harassment" in text or "harass" in text or "molest" in text or "physical touch" in text or "misconduct" in text:
        return "harassment", "Harassment concern"
    if "ragging" in text or "ragged" in text or "bully" in text or "bullying" in text:
        return "ragging", "Ragging concern"
    if "corruption" in text or "bribe" in text or "extortion" in text or "forced money" in text or "taking money" in text:
        return "corruption", "Corruption concern"
    if "gun" in text or "weapon" in text or "firing" in text or "shooting" in text or "violence" in text:
        return "weapon_violence", "Weapon or violence concern"
    if "snake" in text or "animal" in text:
        return "animal_danger", "Campus animal danger"
    if "water contamination" in text or "contaminated water" in text or ("water" in text and "contamination" in text) or "ph level" in text:
        return "water_contamination", "Water contamination concern"
    if "electric shock" in text or "fire" in text or "gas leak" in text:
        return "electric_fire", "Electric or fire safety concern"
    if "food poisoning" in text:
        return "food_poisoning", "Food poisoning concern"
    if "plaster" in text or "ceiling" in text or "building" in text or "wall crack" in text or "can injure" in text:
        return "building_injury", "Building injury concern"
    return "other", str(item.get("title", "Urgent concern"))


def gemini_reasoning_layer(
    term_name: str,
    themes: list[dict[str, Any]],
    quality: dict[str, Any],
    feedback_count: int,
    grievance_count: int,
) -> dict[str, Any]:
    base_reasoning = base_issue_priority_scoring_layer(
        term_name=term_name,
        themes=themes,
        quality=quality,
        feedback_count=feedback_count,
        grievance_count=grievance_count,
    )
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {
            **base_reasoning,
            "mode": "gemini_not_configured",
            "provider": "none",
            "ultraConcerningIssues": [],
        }

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    prompt = build_gemini_prompt(
        term_name=term_name,
        themes=themes,
        quality=quality,
        feedback_count=feedback_count,
        grievance_count=grievance_count,
    )
    body = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.15,
                "responseMimeType": "application/json",
            },
        }
    ).encode("utf-8")

    try:
        request = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
        text = (
            result.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        parsed = parse_gemini_json(text)
        return normalize_reasoning_result(parsed, base_reasoning, "gemini")
    except Exception as error:
        return {
            **base_reasoning,
            "mode": "gemini_unavailable",
            "provider": "gemini",
            "geminiError": f"{type(error).__name__}: {str(error)[:180]}",
            "ultraConcerningIssues": [],
        }


def build_gemini_prompt(
    term_name: str,
    themes: list[dict[str, Any]],
    quality: dict[str, Any],
    feedback_count: int,
    grievance_count: int,
) -> str:
    issue_clusters = [
        {
            "id": str(index),
            "title": theme["title"],
            "summary": theme["summary"],
            "mentions": theme["mentionCount"],
            "sentiment": theme["sentiment"],
            "currentPriority": theme["priority"],
            "evidenceSamples": extract_theme_evidence_samples(theme),
            "evidenceDepartments": extract_theme_departments(theme),
            "extractedEntities": extract_theme_entities(theme),
            "taxonomy": extract_theme_taxonomy(theme),
            "confidence": extract_theme_confidence(theme),
        }
        for index, theme in enumerate(themes[:30])
    ]
    payload = {
        "termName": term_name,
        "totalResponses": feedback_count,
        "grievances": grievance_count,
        "qualitySummary": quality["summary"],
        "issueClusters": issue_clusters,
    }
    return (
        "You are the final reasoning layer for a student feedback analytics system. "
        "You receive only filtered and clustered issue summaries, never raw feedback. "
        "Return strict JSON only with keys: ultraConcerningIssues, priorityLabels, issueDetails, reportNarrative. "
        "Task 1: ultraConcerningIssues must include only rare serious risks such as ragging, harassment, "
        "physical misconduct, corruption/bribe/extortion, shooting/weapon/violence, snake/animal danger, "
        "building collapse/plaster injury risk, electric shock/fire/gas leak, food poisoning or water contamination. "
        "Do not include normal dissatisfaction like food taste, Wi-Fi, teaching clarity, marks, canteen delay or mess hygiene unless it implies immediate danger. "
        "Each ultraConcerningIssues object should include id, title, reason, mentions, detailedSummary. detailedSummary should be 2-4 plain-English sentences and must explain the danger using only evidence. "
        "Task 2: priorityLabels must follow the system's percentage rule, not opinion: HIGH when an issue has more than 10 percent of valid comments, MEDIUM when it has 5 to 10 percent, and LOW when it has under 5 percent. "
        "Task 3: issueDetails must contain one object for each issue cluster with id, plainEnglishSummary, recommendedAction. "
        "plainEnglishSummary must be 3-5 sentences in simple English. Write like a careful college admin explaining the issue to a principal. Include department, semester, building, room, location, named clues, category, and impact only when those details are present in extractedEntities, evidenceDepartments or evidenceSamples. "
        "Do not mention location when the issue is not location-based, such as faculty behaviour, faculty attendance, marks partiality, assignments, exams, placements or communication. "
        "If the exact issue itself is not described clearly in the evidence, write exactly: The exact issue is not described in the feedbacks. "
        "Do not write phrases like 'AI found', 'EduPulse found', or 'the AI grouped'. Write like a human admin report. "
        "RecommendedAction must be one practical admin action based only on the evidence and must include why this action is needed. "
        "Task 4: reportNarrative should be clear human English using the same report sections: executiveSummary, topIssuesSummary, rootCauseSummary, actionPlanSummary. "
        "executiveSummary should mention total responses, useful signals after filtering, whether response volume is enough, and what the feedback is mostly about. "
        "actionPlanSummary should be detailed enough for implementation: first priority, owner type, verification step, fix step, and follow-up measurement. "
        "Use cautious wording and do not invent facts not present in clusters.\n\n"
        f"INPUT_JSON:\n{json.dumps(payload, ensure_ascii=False)}"
    )


def parse_gemini_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start < 0 or end < start:
            raise
        parsed = json.loads(cleaned[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("Gemini returned JSON but not an object")
    return parsed


def extract_theme_evidence_samples(theme: dict[str, Any]) -> list[str]:
    evidence = theme.get("evidence", {})
    if not isinstance(evidence, dict):
        return []
    samples = evidence.get("sampleComments") or evidence.get("examples") or []
    if not isinstance(samples, list):
        return []
    return [str(sample)[:280] for sample in samples if str(sample).strip()][:5]


def extract_theme_departments(theme: dict[str, Any]) -> dict[str, int]:
    evidence = theme.get("evidence", {})
    if not isinstance(evidence, dict):
        return {}
    departments = evidence.get("departments")
    if not isinstance(departments, dict):
        return {}
    return {
        str(key): int(NumberLike(value))
        for key, value in departments.items()
        if str(key).strip() and str(key) != "UNKNOWN"
    }


def extract_theme_entities(theme: dict[str, Any]) -> dict[str, Any]:
    evidence = theme.get("evidence", {})
    if not isinstance(evidence, dict):
        return {}
    entities = evidence.get("extractedEntities")
    return entities if isinstance(entities, dict) else {}


def extract_theme_taxonomy(theme: dict[str, Any]) -> dict[str, Any]:
    evidence = theme.get("evidence", {})
    if not isinstance(evidence, dict):
        return {}
    taxonomy = evidence.get("taxonomy")
    return taxonomy if isinstance(taxonomy, dict) else {}


def extract_theme_confidence(theme: dict[str, Any]) -> int:
    evidence = theme.get("evidence", {})
    if not isinstance(evidence, dict):
        return 0
    try:
        return int(evidence.get("issueConfidence", 0))
    except (TypeError, ValueError):
        return 0


def base_issue_priority_scoring_layer(
    term_name: str,
    themes: list[dict[str, Any]],
    quality: dict[str, Any],
    feedback_count: int,
    grievance_count: int,
) -> dict[str, Any]:
    priority_labels = []
    issue_details = []
    priority_denominator = priority_comment_denominator(quality)
    for index, theme in enumerate(themes[:30]):
        mention_share = mention_priority_share(theme["mentionCount"], priority_denominator)
        priority = mention_priority(theme["mentionCount"], priority_denominator)
        samples = extract_theme_evidence_samples(theme)
        summary = (
            build_plain_issue_summary(theme, samples)
            if samples
            else "The exact issue is not described in the feedbacks."
        )
        priority_labels.append(
            {
                "id": str(index),
                "title": theme["title"],
                "priority": priority,
                "reason": (
                    f"{theme['mentionCount']} mention(s), {mention_share}% of valid comments "
                    "after quality filtering and duplicate grouping."
                ),
            }
        )
        issue_details.append(
            {
                "id": str(index),
                "title": theme["title"],
                "plainEnglishSummary": summary,
                "recommendedAction": build_plain_recommended_action(theme, samples),
            }
        )

    top_titles = ", ".join(theme["title"] for theme in themes[:3]) or "no dominant issue"
    useful = quality["summary"].get("usefulSignalComments", 0)
    return {
        "mode": "base_issue_priority_scoring",
        "provider": "local_mention_scoring",
        "ultraConcerningIssues": [],
        "priorityLabels": priority_labels,
        "issueDetails": issue_details,
        "reportNarrative": {
            "executiveSummary": (
                f"{term_name}: {feedback_count} response(s) were reduced into "
                f"{len(themes)} issue cluster(s) using {useful} useful signal comment(s). "
                f"Top issue areas are {top_titles}."
            ),
            "topIssuesSummary": f"Top issues are ranked after filtering low-quality text and grouping duplicates. Main clusters: {top_titles}.",
            "rootCauseSummary": "Root causes are taken only from repeated student comment patterns inside the filtered clusters.",
            "actionPlanSummary": "Actions should focus first on high-mention and safety-sensitive clusters, then monitor lower-volume issues in the next cycle.",
        },
        "inputIssueCount": len(themes),
        "feedbackCount": feedback_count,
        "grievanceCount": grievance_count,
    }


def normalize_reasoning_result(
    result: dict[str, Any],
    base: dict[str, Any],
    provider: str,
) -> dict[str, Any]:
    ultra = result.get("ultraConcerningIssues")
    priorities = result.get("priorityLabels")
    issue_details = result.get("issueDetails")
    narrative = result.get("reportNarrative")
    if not isinstance(ultra, list):
        ultra = base["ultraConcerningIssues"]
    if not isinstance(priorities, list):
        priorities = base["priorityLabels"]
    if not isinstance(issue_details, list):
        issue_details = base["issueDetails"]
    if not isinstance(narrative, dict):
        narrative = base["reportNarrative"]
    return {
        **base,
        "mode": "gemini_reasoning_layer",
        "provider": provider,
        "ultraConcerningIssues": normalize_ultra_concerns(ultra)[:8],
        "priorityLabels": normalize_priority_labels(priorities, base["priorityLabels"]),
        "issueDetails": normalize_issue_details(issue_details, base["issueDetails"]),
        "reportNarrative": {
            **base["reportNarrative"],
            **{key: str(value) for key, value in narrative.items()},
        },
    }


def normalize_issue_details(
    items: list[Any],
    base: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    base_by_id = {item["id"]: item for item in base}
    normalized = []
    for item in items:
        if not isinstance(item, dict):
            continue
        item_id = str(item.get("id", ""))
        base_item = base_by_id.get(item_id, {})
        summary = str(
            item.get("plainEnglishSummary")
            or item.get("summary")
            or base_item.get("plainEnglishSummary")
            or ""
        ).strip()
        base_summary = str(base_item.get("plainEnglishSummary") or "").strip()
        action = str(
            item.get("recommendedAction")
            or item.get("action")
            or base_item.get("recommendedAction")
            or ""
        ).strip()
        base_action = str(base_item.get("recommendedAction") or "").strip()
        cleaned_summary = clean_issue_detail_text(summary)
        if should_use_base_issue_summary(cleaned_summary, base_summary):
            cleaned_summary = clean_issue_detail_text(base_summary)
        cleaned_action = clean_issue_action_text(action)
        if should_use_base_issue_action(cleaned_action, base_action):
            cleaned_action = clean_issue_action_text(base_action)
        normalized.append(
            {
                "id": item_id,
                "title": str(item.get("title", base_item.get("title", ""))),
                "plainEnglishSummary": cleaned_summary,
                "recommendedAction": cleaned_action,
            }
        )
    return normalized or base


def clean_issue_detail_text(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    cleaned = re.sub(
        r"\bThe students did not describe the exact location in the feedback\.?",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"\bThe feedback does not describe the exact location\.?",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return "The exact issue is not described in the feedbacks."
    return cleaned[:760]


def clean_issue_action_text(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    if not cleaned:
        return "Ask the responsible admin team to verify the issue from feedback evidence before taking action."
    return cleaned[:420]


def should_use_base_issue_summary(candidate: str, base: str) -> bool:
    clean_candidate = normalize_text(candidate)
    if not base.strip():
        return False
    if not clean_candidate or candidate == "The exact issue is not described in the feedbacks.":
        return True
    if "exact location" in clean_candidate:
        return True
    if is_positive_only_comment(clean_candidate) and has_issue_language(normalize_text(base)):
        return True
    return False


def should_use_base_issue_action(candidate: str, base: str) -> bool:
    if not base.strip():
        return False
    clean_candidate = normalize_text(candidate)
    return not clean_candidate or "verify the issue from feedback evidence" in clean_candidate


def normalize_ultra_concerns(items: list[Any]) -> list[dict[str, Any]]:
    normalized = []
    for index, item in enumerate(items):
        if isinstance(item, dict):
            normalized.append(
                {
                    "id": str(item.get("id", index)),
                    "title": str(item.get("title", item.get("issue", "Ultra concerning issue"))),
                    "reason": str(item.get("reason", item.get("summary", "Rare safety or misconduct signal found in final issue clusters."))),
                    "detailedSummary": clean_issue_detail_text(
                        str(
                            item.get("detailedSummary")
                            or item.get("plainEnglishSummary")
                            or item.get("reason")
                            or item.get("summary")
                            or "Serious safety signal detected from student reports."
                        )
                    ),
                    "mentions": int(NumberLike(item.get("mentions", 1))),
                    "source": str(item.get("source", "gemini_issue_cluster_reasoning")),
                }
            )
        elif isinstance(item, str) and item.strip():
            normalized.append(
                {
                    "id": str(index),
                    "title": item.strip()[:90],
                    "reason": "Rare safety or misconduct signal found in final issue clusters.",
                    "detailedSummary": "Serious safety signal detected from student reports.",
                    "mentions": 1,
                    "source": "gemini_issue_cluster_reasoning",
                }
            )
    return normalized


def NumberLike(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 1
    return max(1, number)


def build_plain_issue_summary(theme: dict[str, Any], samples: list[str]) -> str:
    useful_samples = [sample.strip() for sample in samples if len(sample.strip().split()) >= 5]
    if not useful_samples:
        return "The exact issue is not described in the feedbacks."
    text = normalize_text(f"{theme.get('title', '')} {theme.get('summary', '')} {' '.join(useful_samples)}")
    title = str(theme.get("title", "Feedback issue"))
    mention_count = int(NumberLike(theme.get("mentionCount", len(useful_samples))))
    sample_sentence = evidence_sentence(useful_samples)
    entity_text = entity_sentence_from_theme(theme)
    impact = issue_impact_sentence(text, title)
    opening = issue_opening_sentence(title, text, mention_count)
    return clean_issue_detail_text(
        f"{opening} {sample_sentence} {impact} {entity_text}".strip()
    )


def evidence_excerpt(value: str, limit: int) -> str:
    return re.sub(r"\s+", " ", value.strip())[:limit].rstrip(" .")


def evidence_sentence(samples: list[str]) -> str:
    excerpts = [evidence_excerpt(sample, 170) for sample in samples[:3]]
    if not excerpts:
        return ""
    if len(excerpts) == 1:
        return f"The main evidence says: {excerpts[0]}."
    if len(excerpts) == 2:
        return (
            f"One comment says: {excerpts[0]}. "
            f"Another related comment says: {excerpts[1]}."
        )
    return (
        f"One comment says: {excerpts[0]}. "
        f"Another related comment says: {excerpts[1]}. "
        f"A third comment adds: {excerpts[2]}."
    )


def issue_opening_sentence(title: str, text: str, mentions: int) -> str:
    mention_text = f"{mentions} filtered comment(s)" if mentions != 1 else "One filtered comment"
    point_verb = "points" if mentions == 1 else "point"
    ask_verb = "asks" if mentions == 1 else "ask"
    request_verb = "requests" if mentions == 1 else "request"
    if "assignment" in text:
        return f"{mention_text} {point_verb} to assignment scheduling or submission-time concerns."
    if has_academic_workload_language(text):
        return f"{mention_text} {point_verb} to academic workload or exam-pressure concerns."
    if "marks partiality" in text or "partiality" in text or "internal marks" in text or "practical marks" in text:
        return f"{mention_text} {point_verb} to a fairness concern in marks or practical evaluation."
    if any(hint in text for hint in FACULTY_ATTENDANCE_HINTS):
        return f"{mention_text} {point_verb} to irregular faculty attendance or missed lecture slots."
    if "doubt" in text:
        return f"{mention_text} {point_verb} to slow or incomplete doubt-resolution support."
    if has_practical_example_language(text):
        return f"{mention_text} {ask_verb} for more practical examples and applied teaching support."
    if "subject knowledge" in text or "lack knowledge" in text or "cannot explain" in text:
        return f"{mention_text} {point_verb} to teaching-quality or subject-knowledge gaps."
    if "new faculty" in text or "replace faculty" in text:
        return f"{mention_text} {request_verb} faculty replacement or additional teaching support."
    if "faculty" in text or "teacher" in text:
        return f"{mention_text} {point_verb} to a faculty-related concern."
    if "projector" in text:
        return f"{mention_text} {point_verb} to a classroom projector problem."
    if "placement" in text:
        return f"{mention_text} {point_verb} to placement access or eligibility communication concerns."
    if "lab equipment" in text or ("lab" in text and ("equipment" in text or "component" in text)):
        return f"{mention_text} {point_verb} to lab equipment availability or practical-session readiness concerns."
    if "mess" in text or "food" in text or "canteen" in text:
        return f"{mention_text} {point_verb} to food-service quality, hygiene or availability concerns."
    if "wifi" in text or "internet" in text or "network" in text:
        return f"{mention_text} {point_verb} to network connectivity problems."
    if has_event_activity_language(text):
        return f"{mention_text} {point_verb} to campus activity or extracurricular planning concerns."
    if has_sports_timing_language(text):
        return f"{mention_text} {point_verb} to sports facility access or timing concerns."
    if "sports" in text or "equipment" in text:
        return f"{mention_text} {point_verb} to sports equipment or facility availability concerns."
    if "library" in text:
        return f"{mention_text} {point_verb} to library access or facility concerns."
    if has_transport_language(text):
        return f"{mention_text} {point_verb} to transport reliability concerns."
    return f"{mention_text} {point_verb} to {title.lower()}."


def issue_impact_sentence(text: str, title: str) -> str:
    if "assignment" in text:
        return "This can affect academic planning because students may get less time to complete work properly."
    if has_academic_workload_language(text):
        return "This can affect preparation quality because students may feel overloaded during exams or academic deadlines."
    if "marks" in text or "partiality" in text:
        return "This can reduce student trust in assessment fairness if it is not verified and handled transparently."
    if has_practical_example_language(text):
        return "This can affect concept clarity because students are asking for teaching to connect more directly with practical use."
    if "faculty" in text or "teacher" in text or "doubt" in text:
        return "This can affect learning quality because students depend on regular classes, clear explanations and timely doubt support."
    if "projector" in text or "classroom" in text:
        return "This can directly disturb classroom teaching until the equipment or room issue is fixed."
    if "placement" in text:
        return "This can affect student opportunity and trust if eligibility rules are not explained clearly."
    if "lab equipment" in text or ("lab" in text and ("equipment" in text or "component" in text)):
        return "This can affect practical learning because students need working equipment and components during lab sessions."
    if "mess" in text or "food" in text or "canteen" in text:
        return "This affects daily student experience because food quality and hygiene are used every day."
    if "wifi" in text or "internet" in text:
        return "This affects practical work, submissions and project activity when students need stable connectivity."
    if has_event_activity_language(text):
        return "This affects campus participation because students expect events and activities to be planned with enough access and time."
    if has_sports_timing_language(text):
        return "This affects student participation because limited timings can make sports facilities hard to use."
    if "sports" in text:
        return "This affects campus participation because students cannot use activities properly without required equipment or access."
    if "library" in text:
        return "This affects exam preparation and study time when library access is limited."
    if has_transport_language(text):
        return "This affects punctuality and daily commute reliability."
    return f"This should be reviewed because repeated feedback connects it to {title.lower()}."


def has_transport_language(text: str) -> bool:
    return "transport" in text or bool(re.search(r"\bbus(?:es)?\b", text))


def has_academic_workload_language(text: str) -> bool:
    return any(
        phrase in text
        for phrase in ("exam load", "academic load", "workload", "load feels high", "study pressure")
    )


def has_practical_example_language(text: str) -> bool:
    return "practical examples" in text or "examples needed" in text or "more practical examples" in text


def has_event_activity_language(text: str) -> bool:
    return any(
        phrase in text
        for phrase in ("extracurricular", "event", "events", "activities", "campus activity")
    )


def has_sports_timing_language(text: str) -> bool:
    return any(
        phrase in text
        for phrase in ("sports facility timing", "sports facilities", "timings are limited", "limited timings", "practice timing", "practice timings")
    )


def entity_sentence_from_theme(theme: dict[str, Any]) -> str:
    evidence = theme.get("evidence", {})
    if not isinstance(evidence, dict):
        return ""
    entities = evidence.get("extractedEntities")
    if not isinstance(entities, dict):
        return ""
    parts = []
    locations = [str(item) for item in entities.get("locations", []) if str(item).strip()]
    people = [str(item) for item in entities.get("people", []) if str(item).strip()]
    semesters = [str(item) for item in entities.get("semesters", []) if str(item).strip()]
    departments = entities.get("departments", {})
    if locations:
        parts.append(f"Location clue(s): {', '.join(locations[:3])}.")
    if people:
        parts.append(f"Named person/student clue(s): {', '.join(people[:3])}.")
    if departments and isinstance(departments, dict):
        parts.append(f"Department clue(s): {', '.join(list(departments.keys())[:3])}.")
    if semesters:
        parts.append(f"Year/semester clue(s): {', '.join(semesters[:3])}.")
    return " ".join(parts)


def extract_departments_from_text(text: str) -> dict[str, int]:
    clean = normalize_text(text)
    departments = {}
    for code in ("CSE", "ECE", "IT", "ME", "CE", "CSDS", "CS DS", "CSD"):
        if re.search(rf"\b{code.lower()}\b", clean):
            departments[code.replace(" ", "")] = 1
    return departments


def build_plain_recommended_action(theme: dict[str, Any], samples: list[str]) -> str:
    text = normalize_text(f"{theme.get('title', '')} {theme.get('summary', '')} {' '.join(samples)}")
    if "assignment" in text:
        return "Review assignment upload dates and deadline spacing because students are flagging workload timing as the practical cause of the issue."
    if has_academic_workload_language(text):
        return "Review exam load, syllabus pacing and deadline clustering because students are reporting academic pressure rather than a single classroom fault."
    if "projector" in text:
        return "Inspect the mentioned classroom projector and repair or replace it before the next class slot because teaching is being affected."
    if "partiality" in text or "marks" in text:
        return "Review the marking concern confidentially and verify whether evaluation rules were followed because students are questioning fairness."
    if any(hint in text for hint in FACULTY_ATTENDANCE_HINTS):
        return "Verify faculty attendance records, missed lecture slots and student timetable impact before the next department review because class regularity is the reported root issue."
    if "doubt" in text:
        return "Ask the department to check doubt-session availability and response time because students are asking for faster academic support."
    if has_practical_example_language(text):
        return "Ask faculty coordinators to add practical examples in lectures because students are asking for clearer applied understanding."
    if "placement" in text:
        return "Review placement eligibility communication and confirm whether ECE students were fairly allowed for eligible drives because opportunity access is the concern."
    if "lab equipment" in text or ("lab" in text and ("equipment" in text or "component" in text)):
        return "Check lab equipment availability and replace missing or faulty components because practical sessions depend on working lab resources."
    if "fest" in text:
        return "Review the event schedule and collect student feedback before planning the next fest duration because students are reporting that the event felt too short."
    if has_event_activity_language(text):
        return "Review the campus activity calendar and participation process because students are asking for better-planned extracurricular opportunities."
    if "sports item" in text or "sports items" in text:
        return "Audit sports inventory and make required items available during practice hours because students cannot use sports facilities without equipment."
    if has_sports_timing_language(text):
        return "Review sports facility timings and access slots because students are saying availability is limited even when facilities are good."
    if "behaviour" in text or "behavior" in text or "rude" in text:
        return "Ask the department head to review classroom behaviour complaints confidentially because the issue affects classroom trust."
    if "knowledge" in text or "new faculty" in text:
        return "Review subject allocation and arrange faculty mentoring or replacement where repeated learning gaps are confirmed because students are reporting teaching-quality gaps."
    if "wifi" in text:
        return "Check the affected Wi-Fi zone and publish a resolution timeline because connectivity issues affect project and submission work."
    if "mess" in text or "food" in text or "canteen" in text:
        return "Inspect the affected food service area and verify hygiene and food quality controls because students use this service daily."
    if "washroom" in text or "classroom" in text or "infrastructure" in text:
        return "Inspect the affected infrastructure area and close the repair with proof of completion because repeated comments point to a maintenance gap."
    if has_transport_language(text):
        return "Check route timing and student pickup/drop issues because transport feedback affects daily punctuality."
    return "Assign an admin owner to verify the issue and track closure in the next feedback cycle because the comments show a repeated concern."


def normalize_priority_labels(
    labels: list[Any],
    base: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    base_by_id = {item["id"]: item for item in base}
    normalized = []
    for item in labels:
        if not isinstance(item, dict):
            continue
        item_id = str(item.get("id", ""))
        priority = str(item.get("priority", "")).upper()
        if priority not in {"HIGH", "MEDIUM", "LOW"}:
            priority = base_by_id.get(item_id, {}).get("priority", "LOW")
        normalized.append(
            {
                "id": item_id,
                "title": str(item.get("title", base_by_id.get(item_id, {}).get("title", ""))),
                "priority": priority,
                "reason": str(item.get("reason", base_by_id.get(item_id, {}).get("reason", ""))),
            }
        )
    return normalized or base


def apply_reasoning_priorities(
    themes: list[dict[str, Any]],
    reasoning: dict[str, Any],
    priority_denominator: int,
) -> list[dict[str, Any]]:
    ultra_ids = {
        str(item.get("id"))
        for item in reasoning.get("ultraConcerningIssues", [])
        if isinstance(item, dict)
    }
    updated = []
    for index, theme in enumerate(themes):
        item = {**theme}
        item_id = str(index)
        if item_id in ultra_ids:
            item["priority"] = "CRITICAL"
        else:
            item["priority"] = mention_priority(item["mentionCount"], priority_denominator)
        priority_share = mention_priority_share(item["mentionCount"], priority_denominator)
        item["evidence"] = {
            **item.get("evidence", {}),
            "reasoningLayerPriority": item["priority"],
            "prioritySharePercent": priority_share,
            "priorityRule": ">10% HIGH, 5-10% MEDIUM, <5% LOW of valid comments after quality filtering",
        }
        updated.append(item)
    return updated


def apply_reasoning_issue_details(
    themes: list[dict[str, Any]],
    reasoning: dict[str, Any],
) -> list[dict[str, Any]]:
    details_by_index = {
        str(item.get("id")): item
        for item in reasoning.get("issueDetails", [])
        if isinstance(item, dict)
    }
    updated = []
    for index, theme in enumerate(themes):
        item = {**theme}
        detail = details_by_index.get(str(index))
        if detail:
            item["evidence"] = {
                **item.get("evidence", {}),
                "geminiPlainEnglishSummary": clean_issue_detail_text(
                    str(detail.get("plainEnglishSummary", ""))
                ),
                "geminiRecommendedAction": clean_issue_action_text(
                    str(detail.get("recommendedAction", ""))
                ),
            }
        else:
            samples = extract_theme_evidence_samples(item)
            item["evidence"] = {
                **item.get("evidence", {}),
                "geminiPlainEnglishSummary": build_plain_issue_summary(item, samples),
                "geminiRecommendedAction": build_plain_recommended_action(item, samples),
            }
        updated.append(item)
    return updated


def sync_reasoning_with_final_themes(
    reasoning: dict[str, Any],
    themes: list[dict[str, Any]],
    priority_denominator: int,
) -> dict[str, Any]:
    priority_labels = []
    issue_details = []
    for index, theme in enumerate(themes):
        share = mention_priority_share(theme["mentionCount"], priority_denominator)
        evidence = theme.get("evidence", {}) if isinstance(theme.get("evidence"), dict) else {}
        priority_labels.append(
            {
                "id": str(index),
                "title": theme["title"],
                "priority": theme["priority"],
                "reason": (
                    f"{theme['mentionCount']} mention(s), {share}% of "
                    f"{priority_denominator} useful filtered comment(s). "
                    "Rule: >10% HIGH, 5-10% MEDIUM, <5% LOW."
                ),
            }
        )
        issue_details.append(
            {
                "id": str(index),
                "title": theme["title"],
                "plainEnglishSummary": clean_issue_detail_text(
                    str(evidence.get("geminiPlainEnglishSummary") or theme.get("summary") or "")
                ),
                "recommendedAction": clean_issue_action_text(
                    str(evidence.get("geminiRecommendedAction") or theme.get("actionTitle") or "")
                ),
            }
        )
    return {
        **reasoning,
        "priorityLabels": priority_labels,
        "issueDetails": issue_details,
        "priorityRule": {
            "denominator": priority_denominator,
            "basis": "useful filtered comments after quality filtering and duplicate grouping",
            "high": ">10%",
            "medium": "5-10%",
            "low": "<5%",
        },
    }


def priority_comment_denominator(quality: dict[str, Any]) -> int:
    summary = quality.get("summary", {}) if isinstance(quality, dict) else {}
    value = summary.get("usefulSignalComments") or summary.get("usefulComments") or 0
    return max(1, int(NumberLike(value)))


def mention_priority_share(mentions: int, denominator: int) -> float:
    return round((int(NumberLike(mentions)) / max(1, denominator)) * 100, 2)


def mention_priority(mentions: int, denominator: int) -> Priority:
    share = mention_priority_share(mentions, denominator)
    if share > 10:
        return "HIGH"
    if share >= 5:
        return "MEDIUM"
    return "LOW"


def generate_report_narrative(
    term_name: str,
    themes: list[dict[str, Any]],
    actions: list[dict[str, Any]],
    quality: dict[str, Any],
    feedback_count: int,
    grievance_count: int,
    reasoning: dict[str, Any] | None = None,
) -> dict[str, Any]:
    critical_themes = [theme for theme in themes if theme["priority"] == "CRITICAL"]
    high_themes = [theme for theme in themes if theme["priority"] == "HIGH"]
    negative_themes = [
        theme for theme in themes if theme["sentiment"] in {"NEGATIVE", "CRITICAL"}
    ]
    top_theme = themes[0]["title"] if themes else "no dominant issue"
    rejected = quality["summary"]["rejected"]

    reasoning_narrative = reasoning.get("reportNarrative", {}) if reasoning else {}
    executive_summary = str(reasoning_narrative.get("executiveSummary") or (
        f"{term_name}: analyzed {feedback_count} rating response(s), "
        f"{quality['summary']['usefulComments']} useful comment(s), and "
        f"{grievance_count} grievance(s). The result contains {len(themes)} theme(s), "
        f"with {len(negative_themes)} negative/critical signal(s), "
        f"{len(critical_themes)} critical risk(s), and {len(actions)} action item(s). "
        f"Top signal: {top_theme}."
    ))

    return {
        "mode": "gemini-assisted-report-generator" if reasoning else "structured-local-report-generator",
        "executiveSummary": executive_summary,
        "topIssuesSummary": reasoning_narrative.get("topIssuesSummary"),
        "rootCauseSummary": reasoning_narrative.get("rootCauseSummary"),
        "actionPlanSummary": reasoning_narrative.get("actionPlanSummary"),
        "boardReadyHighlights": [
            f"Top concern: {top_theme}",
            f"Critical themes: {len(critical_themes)}",
            f"High priority themes: {len(high_themes)}",
            f"Rejected low-quality comments: {sum(rejected.values())}",
        ],
        "recommendedNextStep": (
            actions[0]["title"] if actions else "Collect more feedback before action planning"
        ),
        "llmReadyPayload": {
            "themes": [
                {
                    "title": theme["title"],
                    "priority": theme["priority"],
                    "sentiment": theme["sentiment"],
                    "mentions": theme["mentionCount"],
                }
                for theme in themes[:8]
            ],
            "actions": actions,
        },
    }


def calculate_confidence(
    total_inputs: int, useful_comments: int, duplicate_count: int, theme_count: int
) -> float:
    if total_inputs == 0:
        return 0.35
    sample_score = min(total_inputs / 200, 1) * 0.3
    comment_score = min(useful_comments / max(total_inputs, 1), 1) * 0.25
    theme_score = 0.25 if theme_count > 0 else 0.05
    duplicate_penalty = min(duplicate_count / max(total_inputs, 1), 0.2)
    return round(max(0.35, min(0.95, 0.25 + sample_score + comment_score + theme_score - duplicate_penalty)), 2)


def sentiment_breakdown(
    feedback: list[FeedbackItem], weights: dict[str, int] | None = None
) -> dict[str, Any]:
    overall: Counter[str] = Counter()
    categories: dict[str, Counter[str]] = defaultdict(Counter)

    for item in feedback:
        label = sentiment_from_rating_and_text(item.rating, item.comment or "")
        weight = int((weights or {}).get(item.id, 1))
        overall[label] += weight
        categories[item.categoryName][label] += weight

    return {
        "overall": normalize_sentiment_counts(overall),
        "categories": {
            category: normalize_sentiment_counts(counter)
            for category, counter in categories.items()
        },
    }


def sentiment_from_rating_and_text(rating: int, comment: str) -> Sentiment:
    clean = normalize_text(comment)
    if has_critical_language(clean):
        return "CRITICAL"
    if rating <= 2:
        return "NEGATIVE"
    if rating == 3:
        return "NEUTRAL"
    return "POSITIVE"


def normalize_sentiment_counts(counter: Counter[str]) -> dict[str, dict[str, float | int]]:
    labels = ["POSITIVE", "NEUTRAL", "NEGATIVE", "CRITICAL"]
    total = sum(counter.values()) or 1
    return {
        label: {
            "count": int(counter[label]),
            "percentage": round((int(counter[label]) / total) * 100, 1),
        }
        for label in labels
    }


def department_satisfaction(items: list[FeedbackItem]) -> dict[str, Any]:
    buckets: dict[str, list[int]] = defaultdict(list)
    for item in items:
        buckets[item.departmentCode or "UNKNOWN"].append(item.rating)
    return {
        department: {
            "averageRating": round(sum(ratings) / len(ratings), 2),
            "responseCount": len(ratings),
        }
        for department, ratings in buckets.items()
    }


def title_from_docs(docs: list[dict[str, Any]]) -> str:
    category_counter = Counter(doc["categoryName"] for doc in docs)
    text = normalize_text(" ".join(doc["text"] for doc in docs))
    category = category_counter.most_common(1)[0][0]
    taxonomy_title = taxonomy_title_from_docs(docs)
    if taxonomy_title:
        return taxonomy_title
    if "harassment" in text:
        return "Harassment concern"
    if "ragging" in text or "ragged" in text:
        return "Ragging concern"
    if "snake" in text:
        return f"{category} snake issue"
    if "gun" in text or "firing" in text or "shooting" in text:
        return f"{category} gun firing issue"
    if "corruption" in text or "bribe" in text or "forced money" in text or "taking money" in text:
        return "Corruption concern"
    if "projector" in text:
        return f"{category} projector issue"
    if normalize_text(category) == "mess" and any(
        hint in text
        for hint in {
            "mess",
            "food",
            "hygiene",
            "cleanliness",
            "clean",
            "insects",
            "quantity",
            "serving",
            "dinner",
            "lunch",
            "hostel",
        }
    ):
        return "Mess hygiene and food availability issue"
    if "placement" in text or "placements" in text:
        return "Placement access issue"
    if "fest" in text or "fests" in text:
        return "Fest duration issue"
    if "sports item" in text or "sports items" in text:
        return "Sports item availability issue"
    if "lack knowledge" in text or "lacks knowledge" in text or "subject knowledge" in text:
        return f"{category} subject knowledge issue"
    if "new faculty" in text:
        return f"{category} new faculty request"
    if any(hint in text for hint in FACULTY_MARKS_HINTS):
        return f"{category} marks partiality issue"
    if any(hint in text for hint in FACULTY_ATTENDANCE_HINTS):
        return f"{category} attendance issue"
    if any(hint in text for hint in FACULTY_BEHAVIOUR_HINTS):
        return f"{category} behaviour issue"
    keyword = top_keyword(text)
    if keyword and keyword != "feedback":
        return f"{category} {keyword} issue"
    return f"{category} repeated concern"


def most_common_category_id(docs: list[dict[str, Any]]) -> str | None:
    category_ids = [doc["categoryId"] for doc in docs if doc.get("categoryId")]
    if not category_ids:
        return None
    return Counter(category_ids).most_common(1)[0][0]


def top_keyword(text: str) -> str:
    words = [
        word
        for word in normalize_text(text).split()
        if len(word) > 3 and word not in STOPWORDS
    ]
    if not words:
        return "feedback"
    return Counter(words).most_common(1)[0][0]


def normalize_text(text: str) -> str:
    lowered = text.lower()
    lowered = re.sub(r"\bwi[\s-]?fi\b", "wifi", lowered)
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


def has_critical_language(text: str) -> bool:
    clean = normalize_text(text)
    return any(word in clean for word in CRITICAL_WORDS)


def has_ultra_concern_language(text: str) -> bool:
    clean = normalize_text(text)
    return any(word in clean for word in ULTRA_CONCERN_WORDS)


def has_health_risk_language(text: str) -> bool:
    clean = normalize_text(text)
    return any(word in clean for word in HEALTH_RISK_WORDS)


def priority_rank(priority: Priority) -> int:
    return {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}[priority]


def model_stack_metadata() -> dict[str, Any]:
    hf_enabled = os.getenv("EDUPULSE_ENABLE_HF_MODELS", "false").lower() == "true"
    return {
        "mode": model_mode(),
        "hfModelsEnabled": hf_enabled,
        "sentiment": {
            "primary": sentiment_model_name(),
            "fallback": "domain_lexicon_plus_rating_rules",
            "criticalOverride": "safety_health_abuse_keyword_layer",
        },
        "themeEmbeddings": {
            "primary": embedding_model_name(),
            "fallback": "tfidf_minibatch_kmeans_then_keyword_cluster",
            "supportsE5Prefixing": "e5" in embedding_model_name().lower(),
        },
        "clustering": {
            "primary": "sklearn.cluster.HDBSCAN density clustering",
            "fallback": "MiniBatchKMeans",
            "reason": "HDBSCAN finds natural issue groups and can mark noise/outliers.",
        },
        "quality": {
            "method": "rule_and_anomaly_filter",
            "checks": [
                "duplicate",
                "too_short",
                "too_generic",
                "repeated_characters",
                "repeated_words",
                "random_text",
                "low_lexical_diversity",
                "out_of_context",
                "extreme_low_information",
            ],
        },
        "reportGeneration": {
            "mode": "structured_local_generator",
            "llmUse": "optional final wording layer after structured signals",
        },
        "humanCorrectionLoop": {
            "endpoint": "/human-feedback",
            "storage": str(CORRECTIONS_PATH),
        },
    }


def model_mode() -> str:
    if os.getenv("EDUPULSE_ENABLE_HF_MODELS", "false").lower() != "true":
        return "deterministic-fallback-safe-mode"
    return "self-hosted-transformer-mode"


def sentiment_model_name() -> str:
    return os.getenv(
        "EDUPULSE_SENTIMENT_MODEL",
        "cardiffnlp/twitter-roberta-base-sentiment-latest",
    )


def embedding_model_name() -> str:
    return os.getenv("EDUPULSE_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")


def get_sentiment_pipeline() -> Any | None:
    global _sentiment_pipeline
    if os.getenv("EDUPULSE_ENABLE_HF_MODELS", "false").lower() != "true":
        return None
    if _sentiment_pipeline is not None:
        return _sentiment_pipeline
    try:
        from transformers import pipeline

        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=sentiment_model_name(),
        )
        return _sentiment_pipeline
    except Exception:
        return None


def get_embedding_model() -> Any | None:
    global _embedding_model
    if os.getenv("EDUPULSE_ENABLE_HF_MODELS", "false").lower() != "true":
        return None
    if _embedding_model is not None:
        return _embedding_model
    try:
        from sentence_transformers import SentenceTransformer

        _embedding_model = SentenceTransformer(embedding_model_name())
        return _embedding_model
    except Exception:
        return None
