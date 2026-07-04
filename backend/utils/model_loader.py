import json
import joblib
import spacy
from pathlib import Path

ML_ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "ml_artifacts"
_loaded_artifacts = None


def _load_json_file(filename: str):
    """Loads a JSON artifact. Raises RuntimeError with a clear message if missing or malformed."""
    path = ML_ARTIFACTS_DIR / filename
    if not path.exists():
        raise RuntimeError(f"Missing required artifact: {path}")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Artifact '{filename}' is not valid JSON: {e}")


def _load_pickle_file(filename: str):
    """Loads a joblib/pickle artifact. Raises RuntimeError with a clear message if missing or corrupt."""
    path = ML_ARTIFACTS_DIR / filename
    if not path.exists():
        raise RuntimeError(f"Missing required artifact: {path}")
    try:
        return joblib.load(path)
    except Exception as e:
        raise RuntimeError(f"Artifact '{filename}' failed to load (corrupt or incompatible library version?): {e}")


def _load_spacy_model(dirname: str):
    """Loads a trained spaCy model directory. Raises RuntimeError if missing or invalid."""
    path = ML_ARTIFACTS_DIR / dirname
    if not path.exists():
        raise RuntimeError(f"Missing required spaCy model directory: {path}")
    try:
        return spacy.load(path)
    except Exception as e:
        raise RuntimeError(f"spaCy model at '{dirname}' failed to load: {e}")


def load_all_artifacts() -> dict:
    """
    Loads every ML artifact required by the app, once, at startup.
    Fails loudly (raises RuntimeError) if any artifact is missing or corrupt,
    per PRD Section 6.1 — better to crash on startup than fail silently mid-request.

    Returns a dict of ready-to-use objects, keyed by name, consumed by services.
    """
    if not ML_ARTIFACTS_DIR.exists():
        raise RuntimeError(f"ml_artifacts directory not found at expected path: {ML_ARTIFACTS_DIR}")

    artifacts = {}

    # Model 1: Skill extractor (NER)
    artifacts["skill_ner_model"] = _load_spacy_model("skill_ner_final")

    # Model 2: Matching engine
    artifacts["tfidf_vectorizer"] = _load_pickle_file("tfidf_vectorizer.pkl")
    artifacts["job_vectors"] = _load_pickle_file("job_vectors.pkl")
    artifacts["job_metadata"] = _load_json_file("job_metadata.json")
    artifacts["master_skills_vocab"] = set(_load_json_file("master_skills_vocab.json"))

    # Course catalog (paid)
    artifacts["course_catalog"] = _load_pickle_file("course_catalog.pkl")
    artifacts["course_skill_vocab"] = _load_json_file("course_skill_vocab.json")
    artifacts["skill_course_index"] = _load_pickle_file("skill_course_index.pkl")

    # Free resources (YouTube + Gemini curated)
    artifacts["free_resources"] = _load_json_file("free_resources.json")

    global _loaded_artifacts
    _loaded_artifacts = artifacts

    return artifacts



def get_artifacts() -> dict:
    """Returns the already-loaded artifacts dict. Services call this instead of
    reloading from disk. Raises RuntimeError if called before startup has run load_all_artifacts()."""
    if _loaded_artifacts is None:
        raise RuntimeError("Artifacts not loaded yet — load_all_artifacts() must run at app startup first")
    return _loaded_artifacts