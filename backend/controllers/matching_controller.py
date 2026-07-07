"""
Matching controller — resume-vs-role analysis and comparison.

Loads a resume's extracted skills, runs TF-IDF job matching, and computes the
importance-weighted skill gap for one target role (`handle_analyze`) or several
side by side (`handle_compare`). Also powers the role type-ahead
(`handle_search_roles`). Results are cached in Redis (keyed by resume + role) and
persisted as MatchResult rows; when a match is weak it surfaces better-fitting
alternate roles.
"""
import json
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from utils.model_loader import get_artifacts
from services.matching_service import (
    match_skills_to_jobs_deduped,
    compute_skill_gap_clean,
    find_best_job_for_role,
    suggest_similar_roles,
)
from models.resume_model import Resume
from models.match_result_model import MatchResult
from config.redis_config import redis_client, is_redis_available

CACHE_TTL_SECONDS = 3600  # 1 hour


def _get_cache_key(resume_id: int, target_role: str) -> str:
    return f"match:{resume_id}:{target_role.lower().strip()}"


def _try_cache_get(key: str):
    """Attempts to read from Redis. Returns None if Redis is down or key doesn't exist."""
    try:
        if not is_redis_available():
            return None
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    return None


def _try_cache_set(key: str, data: dict):
    """Attempts to write to Redis. Silently fails if Redis is down."""
    try:
        if is_redis_available():
            redis_client.setex(key, CACHE_TTL_SECONDS, json.dumps(data))
    except Exception:
        pass


def _load_resume_skills(db: Session, resume_id: int, user_id: int) -> list:
    """Fetches extracted_skills from the resumes table. Raises ValueError if not found."""
    try:
        resume = db.query(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == user_id,
        ).first()
    except SQLAlchemyError as e:
        raise ValueError(f"Database error fetching resume: {e}")

    if not resume:
        raise ValueError(f"Resume {resume_id} not found or doesn't belong to this user")

    skills = resume.extracted_skills
    if isinstance(skills, str):
        skills = json.loads(skills)
    if not skills:
        raise ValueError("Resume has no extracted skills — re-upload the resume first")

    return skills


def _run_analysis(final_skills: list, target_role: str):
    """Runs TF-IDF matching and skill-gap computation for a single target role.
    Returns the best-matching job entry for that role plus skill gap details."""
    artifacts = get_artifacts()

    # Look up the target role against the ENTIRE job database, not just the
    # resume's top matches. A role that exists but scores low against this
    # resume is a valid result (low match %), not a "not found" error.
    target_match = find_best_job_for_role(
        final_skills=final_skills,
        job_vectors=artifacts["job_vectors"],
        job_metadata=artifacts["job_metadata"],
        vectorizer=artifacts["tfidf_vectorizer"],
        target_role=target_role,
    )

    # Only a role that genuinely isn't in the database reaches here.
    if not target_match:
        suggestions = suggest_similar_roles(target_role, artifacts["job_metadata"])
        raise ValueError(
            f"Role '{target_role}' not found in the job database. "
            f"Did you mean: {suggestions}"
        )

    # Deduped top matches — used only to surface better-fitting alternate roles
    # when the target match is weak.
    all_matches = match_skills_to_jobs_deduped(
        final_skills=final_skills,
        job_vectors=artifacts["job_vectors"],
        job_metadata=artifacts["job_metadata"],
        vectorizer=artifacts["tfidf_vectorizer"],
        top_n=20,
    )

    gap = compute_skill_gap_clean(
        final_skills=final_skills,
        job_skills_raw=target_match["job_skills_raw"],
        match_score=target_match["match_score"],
        master_skills_vocab=artifacts["master_skills_vocab"],
        vectorizer=artifacts["tfidf_vectorizer"],
    )

    return target_match, gap, all_matches


def handle_analyze(db: Session, user_id: int, resume_id: int, target_role: str) -> dict:
    """Single-role analysis: match %, skill gap, and alternate suggestions if match is low."""
    # check cache first
    cache_key = _get_cache_key(resume_id, target_role)
    cached = _try_cache_get(cache_key)
    if cached:
        return cached

    final_skills = _load_resume_skills(db, resume_id, user_id)
    target_match, gap, all_matches = _run_analysis(final_skills, target_role)

    # alternate suggestions: if match is below 50%, suggest top 2 better-fitting roles
    alternate_suggestions = []
    if gap["match_percent"] < 50:
        for m in all_matches:
            if m["job_title"].lower().strip() != target_role.lower().strip():
                alt_gap = compute_skill_gap_clean(
                    final_skills=final_skills,
                    job_skills_raw=m["job_skills_raw"],
                    match_score=m["match_score"],
                    master_skills_vocab=get_artifacts()["master_skills_vocab"],
                    vectorizer=get_artifacts()["tfidf_vectorizer"],
                )
                alternate_suggestions.append({
                    "role": m["job_title"],
                    "match_percent": alt_gap["match_percent"],
                    "missing_count": len(alt_gap["missing_skills"]),
                })
                if len(alternate_suggestions) >= 2:
                    break

    # save to DB
    try:
        match_result = MatchResult(
            resume_id=resume_id,
            target_role=target_role,
            match_percent=gap["match_percent"],
            missing_skills=json.dumps(gap["missing_skills"]),
        )
        db.add(match_result)
        db.commit()
        db.refresh(match_result)
    except SQLAlchemyError as e:
        db.rollback()
        raise ValueError(f"Failed to save match result: {e}")

    result = {
        "match_result_id": match_result.id,
        "target_role": target_role,
        "match_percent": gap["match_percent"],
        "matched_skills": gap["matched_skills"],
        "missing_skills": gap["missing_skills"],
        "skill_importance": gap["skill_importance"],
        "alternate_suggestions": alternate_suggestions,
    }

    _try_cache_set(cache_key, result)
    return result


def handle_search_roles(query: str = "", limit: int = 20) -> dict:
    """Read-only lookup: returns distinct job-role titles from job_metadata,
    filtered by a case-insensitive substring `query`. Powers the frontend's
    type-ahead target-role picker so no role list is ever hardcoded client-side.

    Substring matches that START with the query are ranked before mid-string
    matches, so typing 'data' surfaces 'Data Analyst' before 'Big Data Engineer'.
    """
    artifacts = get_artifacts()
    job_metadata = artifacts["job_metadata"]

    # distinct, non-empty titles
    titles = {
        (job.get("Title") or "").strip()
        for job in job_metadata
    }
    titles.discard("")

    q = (query or "").strip().lower()
    if q:
        matches = [t for t in titles if q in t.lower()]
        matches.sort(key=lambda t: (not t.lower().startswith(q), t.lower()))
    else:
        matches = sorted(titles, key=str.lower)

    limit = max(1, min(limit, 50))
    return {"roles": matches[:limit], "total_available": len(titles)}


def handle_compare(db: Session, user_id: int, resume_id: int, target_roles: list) -> dict:
    """Multi-role comparison: runs analyze for 2-3 roles side by side."""
    if len(target_roles) < 2 or len(target_roles) > 3:
        raise ValueError("Compare mode requires 2 or 3 target roles")

    final_skills = _load_resume_skills(db, resume_id, user_id)
    comparisons = []

    for role in target_roles:
        try:
            target_match, gap, _ = _run_analysis(final_skills, role)

            try:
                match_result = MatchResult(
                    resume_id=resume_id,
                    target_role=role,
                    match_percent=gap["match_percent"],
                    missing_skills=json.dumps(gap["missing_skills"]),
                )
                db.add(match_result)
                db.commit()
                db.refresh(match_result)
            except SQLAlchemyError as e:
                db.rollback()
                raise ValueError(f"Failed to save match result for {role}: {e}")

            comparisons.append({
                "match_result_id": match_result.id,
                "target_role": role,
                "match_percent": gap["match_percent"],
                "matched_skills": gap["matched_skills"],
                "missing_skills": gap["missing_skills"],
                "skill_importance": gap["skill_importance"],
            })
        except ValueError as e:
            comparisons.append({
                "target_role": role,
                "error": str(e),
            })

    return {"resume_id": resume_id, "comparisons": comparisons}
