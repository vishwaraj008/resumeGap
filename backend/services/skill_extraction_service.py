import re
from utils.model_loader import get_artifacts
from utils.text_cleaning import normalize_skill_text, split_compound_skill


def extract_skills_from_resume(resume_text: str) -> dict:
    """
    Hybrid skill extraction: runs the trained NER model and keyword matching
    against the master skill vocabulary, merges results.

    Returns:
        {
            "final_skills": [...],           # what feeds the matching engine
            "found_by_both": [...],          # internal use only
            "found_by_ner_only": [...],      # internal use only
            "found_by_keyword_only": [...]   # internal use only
        }
    """
    if not resume_text or not resume_text.strip():
        raise ValueError("Resume text is empty — nothing to extract skills from")

    try:
        artifacts = get_artifacts()
        ner_model = artifacts["skill_ner_model"]
        master_vocab = artifacts["master_skills_vocab"]
    except RuntimeError as e:
        raise RuntimeError(f"Cannot extract skills — model artifacts unavailable: {e}")

    ner_skills = _extract_via_ner(resume_text, ner_model)
    keyword_skills = _extract_via_keywords(resume_text, master_vocab)

    final_skills = ner_skills | keyword_skills

    return {
        "final_skills": sorted(final_skills),
        "found_by_both": sorted(ner_skills & keyword_skills),
        "found_by_ner_only": sorted(ner_skills - keyword_skills),
        "found_by_keyword_only": sorted(keyword_skills - ner_skills),
    }


def _extract_via_ner(resume_text: str, ner_model) -> set:
    """Runs the resume text through the trained spaCy NER model, extracts SKILL-labeled spans,
    splits any compound spans, and normalizes casing."""
    try:
        doc = ner_model(resume_text)
    except Exception as e:
        raise RuntimeError(f"NER inference failed: {e}")

    skills = set()
    for ent in doc.ents:
        if ent.label_ == "SKILL":
            for piece in split_compound_skill(ent.text):
                normalized = normalize_skill_text(piece)
                if normalized:
                    skills.add(normalized)

    return skills

def _extract_via_keywords(resume_text: str, master_vocab: set) -> set:
    """Searches the resume text for whole-word/phrase matches against the known skill vocabulary,
    using word boundaries to avoid false positives (e.g. 'c' or 'r' matching inside unrelated words)."""
    text_lower = resume_text.lower()
    matched = set()
    for skill in master_vocab:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            matched.add(skill)
    return matched