from sklearn.metrics.pairwise import cosine_similarity

from utils.model_loader import get_artifacts


def _parse_skills_string(skills_str: str) -> set:
    """job_metadata's skills field is a semicolon-separated string
    (e.g. 'C#; VB.NET basics; .NET Framework'). Split and normalize
    into a set for comparison against final_skills."""
    if not skills_str:
        return set()
    return {s.strip().lower() for s in skills_str.split(";") if s.strip()}


def match_skills_to_jobs(
    final_skills: list,
    job_vectors,
    job_metadata: list,
    vectorizer,
    title_col: str = "Title",
    skills_col: str = "Skills",
    id_col: str = "JobID",
    top_n: int = 10,
) -> list:
    """
    Vectorizes final_skills with the fitted TF-IDF vectorizer and scores
    them against every job's precomputed vector via cosine similarity.

    Column names are passed as arguments (not hardcoded) per PRD 5.4 —
    this avoids a KeyError if job_metadata's schema changes or this
    function is reused against a differently-shaped dataset.

    Raises:
        ValueError: if final_skills is empty
        KeyError: if title_col/skills_col/id_col don't exist on a record
    """
    if not final_skills:
        raise ValueError("final_skills is empty — nothing to match against jobs")

    if job_vectors.shape[0] != len(job_metadata):
        raise RuntimeError(
            f"job_vectors has {job_vectors.shape[0]} rows but job_metadata has "
            f"{len(job_metadata)} entries — these artifacts must be regenerated together"
        )

    user_doc = " ".join(final_skills)
    user_vector = vectorizer.transform([user_doc])
    similarities = cosine_similarity(user_vector, job_vectors)[0]

    ranked_indices = similarities.argsort()[::-1][:top_n]

    results = []
    for idx in ranked_indices:
        job = job_metadata[idx]
        results.append({
            "job_id": job[id_col],
            "job_title": job[title_col],
            "job_skills_raw": job[skills_col],
            "match_score": float(similarities[idx]),
        })

    return results


def match_skills_to_jobs_deduped(
    final_skills: list,
    job_vectors,
    job_metadata: list,
    vectorizer,
    title_col: str = "Title",
    skills_col: str = "Skills",
    id_col: str = "JobID",
    top_n: int = 10,
) -> list:
    """
    Same as match_skills_to_jobs, but collapses multiple synthetic postings
    under the same role title (e.g. NET-F-001, NET-F-002, NET-F-003 all
    ".NET Developer") down to the single best-scoring posting per title.

    Per PRD 5.4: pulls a wider candidate pool first (top_n * 5, capped at
    the full job list) so dedup doesn't starve top_n down to fewer than
    top_n *unique* titles.
    """
    wide_pool_size = min(top_n * 5, len(job_metadata))
    candidates = match_skills_to_jobs(
        final_skills, job_vectors, job_metadata, vectorizer,
        title_col=title_col, skills_col=skills_col, id_col=id_col,
        top_n=wide_pool_size,
    )

    best_per_title = {}
    for c in candidates:
        title = c["job_title"]
        if title not in best_per_title or c["match_score"] > best_per_title[title]["match_score"]:
            best_per_title[title] = c

    deduped = sorted(best_per_title.values(), key=lambda x: x["match_score"], reverse=True)
    return deduped[:top_n]


def compute_skill_gap_clean(
    final_skills: list,
    job_skills_raw: str,
    match_score: float,
    master_skills_vocab: set,
) -> dict:
    """
    Computes matched/missing skills for a single job, filtered against
    master_skills_vocab so blocklist noise (e.g. 'fresher', 'entry level' —
    see PRD 5.5) can never surface in missing_skills.

    Uses the SAME cosine-similarity match_score passed in from
    match_skills_to_jobs/_deduped as match_percent — per PRD 5.4, this
    must never be a separately-computed overlap ratio that could disagree
    with the matching function's own score.

    Args:
        final_skills: user's extracted skills
        job_skills_raw: the raw semicolon-separated Skills string for one job
        match_score: cosine similarity score for this job (0.0-1.0),
            taken directly from match_skills_to_jobs/_deduped output
        master_skills_vocab: canonical vocabulary (master_skills_vocab.json),
            used here purely as a noise filter

    Returns:
        {
            "match_percent": float,      # match_score * 100, rounded
            "matched_skills": [...],
            "missing_skills": [...]
        }
    """
    user_skill_set = {s.strip().lower() for s in final_skills}
    job_required = _parse_skills_string(job_skills_raw)

    # Filter both sides against the canonical vocab — drops any stray
    # descriptor terms that slipped into the raw Skills string.
    job_required_clean = job_required & master_skills_vocab

    return {
        "match_percent": round(match_score * 100, 2),
        "matched_skills": sorted(user_skill_set & job_required_clean),
        "missing_skills": sorted(job_required_clean - user_skill_set),
    }