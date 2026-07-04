import re


def normalize_whitespace(text: str) -> str:
    """Collapses multiple spaces/newlines/tabs into single spaces, trims leading/trailing whitespace."""
    if not isinstance(text, str):
        return ""
    return re.sub(r"\s+", " ", text).strip()


def normalize_skill_text(skill: str) -> str:
    """Lowercases and trims a skill string for consistent matching against the vocabulary."""
    if not isinstance(skill, str):
        return ""
    return skill.strip().lower().rstrip(".,;:")


def split_compound_skill(skill_text: str) -> list[str]:
    """Splits a skill span on commas, slashes, ampersands, or 'and' into individual skills.
    Handles cases like NER returning 'C, C++, Java' as a single span."""
    parts = re.split(r",|/|&|\band\b", skill_text)
    return [p.strip() for p in parts if p.strip()]