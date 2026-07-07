"""
PDF report service — renders the skill-gap report.

`generate_pdf_report` fills the Jinja2 HTML template in `templates/` with the
analysis data (match %, matched/missing skills, roadmap, trajectory) and converts
it to PDF bytes via WeasyPrint. Autoescaping is on so resume-derived text can't
break the template markup.
"""
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


def _get_jinja_env() -> Environment:
    if not TEMPLATES_DIR.exists():
        raise RuntimeError(f"Templates directory not found: {TEMPLATES_DIR}")
    return Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)


def generate_pdf_report(
    target_role: str,
    match_percent: float,
    matched_skills: list,
    missing_skills: list,
    roadmap: list,
    total_estimated_hours: float,
    trajectory_graph: dict,
) -> bytes:
    """Renders the report HTML template with the provided data and converts
    it to a PDF via WeasyPrint. Returns raw PDF bytes ready for streaming
    back as a file response.

    All data comes pre-computed from the matching/roadmap services —
    this function does no recomputation (per PRD 9.6)."""

    env = _get_jinja_env()

    try:
        template = env.get_template("report.html")
    except TemplateNotFound:
        raise RuntimeError("report.html template not found in templates directory")

    html_string = template.render(
        target_role=target_role,
        generated_date=datetime.utcnow().strftime("%B %d, %Y"),
        match_percent=round(match_percent, 2),
        matched_skills=matched_skills or [],
        missing_skills=missing_skills or [],
        roadmap=roadmap or [],
        total_estimated_hours=round(total_estimated_hours, 1),
        trajectory_graph=trajectory_graph or {},
    )

    try:
        pdf_bytes = HTML(string=html_string).write_pdf()
    except Exception as e:
        raise RuntimeError(f"WeasyPrint PDF generation failed: {e}")

    return pdf_bytes
