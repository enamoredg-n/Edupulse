from __future__ import annotations

import argparse
import datetime as dt
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]

INCLUDE_PATTERNS = [
    "edupulse-frontend/src/**/*.tsx",
    "edupulse-frontend/src/**/*.ts",
    "edupulse-frontend/src/**/*.css",
    "edupulse-frontend/index.html",
    "edupulse-frontend/vite.config.ts",
    "edupulse-frontend/package.json",
    "edupulse-backend/src/**/*.ts",
    "edupulse-backend/ai-service/app/**/*.py",
    "edupulse-backend/ai-service/evaluation/evaluate_ai.py",
    "edupulse-backend/ai-service/requirements.txt",
    "edupulse-backend/prisma/schema.prisma",
    "edupulse-backend/scripts/**/*.ts",
    "edupulse-backend/package.json",
    "edupulse-backend/nest-cli.json",
    "edupulse-backend/tsconfig.json",
    "edupulse-backend/tsconfig.build.json",
]

EXCLUDE_PARTS = {
    "node_modules",
    "dist",
    "build",
    ".git",
    "__pycache__",
    "generated",
    "coverage",
}

EXCLUDE_SUFFIXES = {
    ".log",
    ".png",
    ".jpg",
    ".jpeg",
    ".zip",
    ".pdf",
    ".lock",
}

EXCLUDE_NAMES = {
    ".env",
    "package-lock.json",
    "migration_lock.toml",
}

EXCLUDE_GLOBS = [
    "edupulse-backend/prisma/*seed*.ts",
    "edupulse-backend/prisma/migrations/**/*.sql",
    "edupulse-backend/ai-service/evaluation/latest_metrics.json",
    "edupulse-backend/ai-service/evaluation/labeled_feedback.json",
]


def is_excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    rel_posix = rel.as_posix()
    if any(part in EXCLUDE_PARTS for part in rel.parts):
        return True
    if path.name in EXCLUDE_NAMES:
        return True
    if path.suffix.lower() in EXCLUDE_SUFFIXES:
        return True
    return any(path.match(pattern) or rel_posix == pattern for pattern in EXCLUDE_GLOBS)


def collect_files() -> list[Path]:
    files: set[Path] = set()
    for pattern in INCLUDE_PATTERNS:
        for path in ROOT.glob(pattern):
            if path.is_file() and not is_excluded(path):
                files.add(path)
    return sorted(files, key=lambda p: p.relative_to(ROOT).as_posix().lower())


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def code_with_line_numbers(text: str) -> str:
    lines = text.splitlines()
    width = max(3, len(str(len(lines))))
    return "\n".join(f"{index:>{width}} | {line}" for index, line in enumerate(lines, 1))


def build_tree(files: list[Path]) -> str:
    return "\n".join(path.relative_to(ROOT).as_posix() for path in files)


def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.drawString(18 * mm, 10 * mm, "EduPulse AI - Source Code PDF")
    canvas.drawRightString(195 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def make_pdf(output: Path, repo_link: str) -> None:
    files = collect_files()
    output.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "TitleCenter",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=22,
        leading=28,
        textColor=colors.HexColor("#0f172a"),
    )
    h1 = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading1"],
        fontSize=15,
        leading=19,
        spaceAfter=8,
        textColor=colors.HexColor("#0f172a"),
    )
    h2 = ParagraphStyle(
        "FileHeading",
        parent=styles["Heading2"],
        fontSize=10,
        leading=13,
        spaceAfter=6,
        textColor=colors.HexColor("#1d4ed8"),
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )
    small = ParagraphStyle(
        "Small",
        parent=styles["BodyText"],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#475569"),
    )
    code = ParagraphStyle(
        "Code",
        fontName="Courier",
        fontSize=5.5,
        leading=6.7,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []
    story.append(Spacer(1, 34 * mm))
    story.append(Paragraph("EduPulse AI", title))
    story.append(Paragraph("Source Code PDF", title))
    story.append(Spacer(1, 12 * mm))
    story.append(
        Paragraph(
            "Student Feedback Analyzer - Team Eureka<br/>"
            "Capgemini Exceller Agentify Buildathon<br/>"
            f"Generated on: {dt.datetime.now().strftime('%d %B %Y, %I:%M %p')}",
            ParagraphStyle("CoverBody", parent=body, alignment=TA_CENTER, fontSize=11, leading=16),
        )
    )
    if repo_link:
        story.append(Spacer(1, 6 * mm))
        story.append(Paragraph(f"GitHub repository: {repo_link}", ParagraphStyle("Repo", parent=body, alignment=TA_CENTER)))

    story.append(PageBreak())
    story.append(Paragraph("Submission Notes", h1))
    story.append(
        Paragraph(
            "This PDF contains the source code files used for the EduPulse AI project. "
            "The code is copied directly from the local project files so that the PDF and GitHub code stay consistent.",
            body,
        )
    )
    story.append(Spacer(1, 4 * mm))
    notes = [
        ["Included", "Frontend React code, backend NestJS code, Python AI service, Prisma schema, and validation scripts."],
        ["Excluded", "node_modules, dist/build output, logs, .env secrets, lock files, generated code, binary assets, and mock seed data."],
        ["Why excluded", "These files are dependencies, generated output, secrets, or large test data. They are not the main source code written for the solution."],
        ["Third-party code", "Libraries are used through package dependencies only. Their internal source code is not included in this PDF."],
    ]
    table = Table(notes, colWidths=[34 * mm, 132 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e0f2fe")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Project Structure Included", h1))
    story.append(Preformatted(build_tree(files), code))

    story.append(PageBreak())
    story.append(Paragraph("Source Code", h1))
    story.append(
        Paragraph(
            f"Total source files included: {len(files)}. Each file starts on a new page with its project path.",
            body,
        )
    )

    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        story.append(PageBreak())
        story.append(Paragraph(rel, h2))
        story.append(Paragraph(f"File size: {path.stat().st_size:,} bytes", small))
        story.append(Spacer(1, 2 * mm))
        story.append(Preformatted(code_with_line_numbers(read_text(path)), code))

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create EduPulse source code PDF.")
    parser.add_argument(
        "--output",
        default=str(ROOT / "deliverables" / "EduPulse_Source_Code.pdf"),
        help="Output PDF path",
    )
    parser.add_argument(
        "--repo-link",
        default=os.environ.get("EDUPULSE_REPO_LINK", ""),
        help="Optional GitHub repo link printed on the cover page",
    )
    args = parser.parse_args()
    make_pdf(Path(args.output), args.repo_link)
    print(args.output)


if __name__ == "__main__":
    main()
