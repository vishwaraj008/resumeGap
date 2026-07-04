import json
import re
from utils.model_loader import get_artifacts
from config.redis_config import redis_client, is_redis_available

CACHE_TTL_SECONDS = 3600

# rough time estimates (in hours) by course duration text or difficulty
# used as fallback when course data doesn't have clean duration info
DEFAULT_HOURS_PER_SKILL = 20

# simple prerequisite graph for common tech skills
# maps a skill to the list of skills that should be learned before it
PREREQUISITE_MAP = {
    "pandas": ["python"],
    "numpy": ["python"],
    "scikit-learn": ["python", "numpy", "pandas"],
    "tensorflow": ["python", "numpy"],
    "pytorch": ["python", "numpy"],
    "keras": ["python", "tensorflow"],
    "flask": ["python"],
    "django": ["python"],
    "fastapi": ["python"],
    "react": ["javascript", "html", "css"],
    "angular": ["javascript", "typescript", "html", "css"],
    "vue.js": ["javascript", "html", "css"],
    "node.js": ["javascript"],
    "express.js": ["javascript", "node.js"],
    "next.js": ["react", "javascript"],
    "typescript": ["javascript"],
    "docker": ["linux"],
    "kubernetes": ["docker"],
    "ci/cd": ["git", "docker"],
    "machine learning": ["python", "numpy", "pandas"],
    "deep learning": ["python", "machine learning"],
    "natural language processing": ["python", "machine learning"],
    "computer vision": ["python", "deep learning"],
    "data analysis": ["python", "sql"],
    "data visualization": ["python", "data analysis"],
    "power bi": ["sql", "data analysis"],
    "tableau": ["sql", "data analysis"],
    "spark": ["python", "sql"],
    "hadoop": ["linux"],
    "mongodb": ["sql"],
    "postgresql": ["sql"],
    "mysql": ["sql"],
    "aws": ["linux"],
    "azure": ["linux"],
    "gcp": ["linux"],
}


def _parse_duration_to_hours(duration_text: str) -> float:
    """Tries to extract an estimated hour count from course duration strings like
    'Approximately 3 months to complete', 'PT6H14M7S', '4-6 weeks', etc."""
    if not duration_text:
        return DEFAULT_HOURS_PER_SKILL

    text = duration_text.lower()

    # ISO 8601 format from YouTube (e.g. PT6H14M7S)
    iso_match = re.match(r"pt(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", text)
    if iso_match:
        hours = int(iso_match.group(1) or 0)
        minutes = int(iso_match.group(2) or 0)
        return round(hours + minutes / 60, 1)

    # "X months" → assume 40 hours/month of study
    month_match = re.search(r"(\d+)\s*months?", text)
    if month_match:
        return int(month_match.group(1)) * 40

    # "X weeks" → assume 10 hours/week
    week_match = re.search(r"(\d+)\s*weeks?", text)
    if week_match:
        return int(week_match.group(1)) * 10

    # "X hours"
    hour_match = re.search(r"(\d+)\s*hours?", text)
    if hour_match:
        return int(hour_match.group(1))

    return DEFAULT_HOURS_PER_SKILL


def _compute_sequence_order(missing_skills: list) -> list:
    """Orders missing skills by prerequisite dependencies. Skills with no
    prerequisites come first, skills that depend on others come later.

    Uses a simple topological-sort approach: count how many of each skill's
    prerequisites are also in the missing list (those are the ones that
    actually need to be learned first)."""
    missing_lower = {s.lower() for s in missing_skills}

    def dependency_weight(skill):
        prereqs = PREREQUISITE_MAP.get(skill.lower(), [])
        # count how many prereqs are also missing (need to be learned first)
        return sum(1 for p in prereqs if p in missing_lower)

    ordered = sorted(missing_skills, key=dependency_weight)
    return ordered


def _get_course_cache_key(skill: str, resource_type: str) -> str:
    return f"courses:{skill.lower()}:{resource_type}"


def _lookup_courses_for_skill(skill: str, resource_type: str = "all") -> list:
    """Looks up paid and/or free courses for a single skill.
    resource_type: 'paid', 'free', or 'all'"""

    # try cache
    cache_key = _get_course_cache_key(skill, resource_type)
    try:
        if is_redis_available():
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    artifacts = get_artifacts()
    skill_lower = skill.lower().strip()
    recommendations = []

    # paid courses from skill_course_index
    if resource_type in ("paid", "all"):
        course_index = artifacts["skill_course_index"]
        paid_courses = course_index.get(skill_lower, [])
        for course in paid_courses[:3]:  # cap at 3 paid recommendations per skill
            recommendations.append({
                "title": course.get("title", ""),
                "url": course.get("url", ""),
                "platform": course.get("platform", ""),
                "duration": course.get("duration", ""),
                "description": course.get("description", "")[:150],
                "is_free": False,
            })

    # free resources from free_resources.json
    if resource_type in ("free", "all"):
        free_resources = artifacts["free_resources"]
        free_courses = free_resources.get(skill_lower, [])
        for resource in free_courses[:2]:  # cap at 2 free recommendations per skill
            recommendations.append({
                "title": resource.get("title", ""),
                "url": resource.get("url", ""),
                "platform": "YouTube",
                "duration": resource.get("duration", ""),
                "description": resource.get("description", "")[:150],
                "channel": resource.get("channel", ""),
                "view_count": resource.get("view_count", 0),
                "is_free": True,
            })

    # cache result
    try:
        if is_redis_available() and recommendations:
            redis_client.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(recommendations))
    except Exception:
        pass

    return recommendations


def _build_trajectory_graph(target_role: str, match_percent: float) -> dict:
    """Builds a simple 2-3 step career trajectory based on the target role.
    Returns node/edge data that the frontend can render as a graph.

    This is rule-based, not ML — maps known role families to progression paths."""
    role_lower = target_role.lower().strip()

    # common career progressions by role family
    trajectories = {
        "data analyst": [
            {"role": "Junior Data Analyst", "level": 1},
            {"role": "Data Analyst", "level": 2},
            {"role": "Senior Data Analyst", "level": 3},
        ],
        "data scientist": [
            {"role": "Data Analyst", "level": 1},
            {"role": "Data Scientist", "level": 2},
            {"role": "ML Engineer", "level": 3},
        ],
        "machine learning engineer": [
            {"role": "Data Scientist", "level": 1},
            {"role": "ML Engineer", "level": 2},
            {"role": "AI Architect", "level": 3},
        ],
        "software developer": [
            {"role": "Junior Developer", "level": 1},
            {"role": "Software Developer", "level": 2},
            {"role": "Senior Developer", "level": 3},
        ],
        "frontend developer": [
            {"role": "Junior Frontend Developer", "level": 1},
            {"role": "Frontend Developer", "level": 2},
            {"role": "Frontend Architect", "level": 3},
        ],
        "backend developer": [
            {"role": "Junior Backend Developer", "level": 1},
            {"role": "Backend Developer", "level": 2},
            {"role": "Backend Architect", "level": 3},
        ],
        "full stack developer": [
            {"role": "Frontend/Backend Developer", "level": 1},
            {"role": "Full Stack Developer", "level": 2},
            {"role": "Tech Lead", "level": 3},
        ],
        "devops engineer": [
            {"role": "System Administrator", "level": 1},
            {"role": "DevOps Engineer", "level": 2},
            {"role": "Platform Engineer", "level": 3},
        ],
        "cloud engineer": [
            {"role": "System Administrator", "level": 1},
            {"role": "Cloud Engineer", "level": 2},
            {"role": "Cloud Architect", "level": 3},
        ],
        "cybersecurity analyst": [
            {"role": "IT Support Specialist", "level": 1},
            {"role": "Cybersecurity Analyst", "level": 2},
            {"role": "Security Architect", "level": 3},
        ],
        "database administrator": [
            {"role": "Junior DBA", "level": 1},
            {"role": "Database Administrator", "level": 2},
            {"role": "Data Architect", "level": 3},
        ],
        "project manager": [
            {"role": "Project Coordinator", "level": 1},
            {"role": "Project Manager", "level": 2},
            {"role": "Program Manager", "level": 3},
        ],
    }

    # try exact match first, then partial
    path = trajectories.get(role_lower)
    if not path:
        for key, val in trajectories.items():
            if key in role_lower or role_lower in key:
                path = val
                break

    # fallback: generic progression
    if not path:
        path = [
            {"role": f"Junior {target_role}", "level": 1},
            {"role": target_role, "level": 2},
            {"role": f"Senior {target_role}", "level": 3},
        ]

    # mark the current fit level based on match_percent
    current_level = 1
    if match_percent >= 70:
        current_level = 2
    elif match_percent >= 40:
        current_level = 1

    for node in path:
        node["is_current_fit"] = node["level"] <= current_level

    return {
        "nodes": path,
        "edges": [
            {"from": path[i]["role"], "to": path[i + 1]["role"]}
            for i in range(len(path) - 1)
        ],
    }


def get_learning_roadmap(
    missing_skills: list,
    target_role: str,
    match_percent: float,
    resource_type: str = "all",
) -> dict:
    """Builds the full learning roadmap response:
    - prerequisite-ordered skill sequence
    - course recommendations per skill (paid + free, filtered by resource_type)
    - total time estimate
    - career trajectory graph data
    """
    if resource_type not in ("all", "free", "paid"):
        resource_type = "all"

    ordered_skills = _compute_sequence_order(missing_skills)

    roadmap_items = []
    total_hours = 0

    for seq, skill in enumerate(ordered_skills, start=1):
        courses = _lookup_courses_for_skill(skill, resource_type)

        # estimate time: use the first paid course's duration if available, else default
        skill_hours = DEFAULT_HOURS_PER_SKILL
        for c in courses:
            parsed = _parse_duration_to_hours(c.get("duration", ""))
            if parsed and parsed != DEFAULT_HOURS_PER_SKILL:
                skill_hours = parsed
                break

        total_hours += skill_hours

        roadmap_items.append({
            "sequence_order": seq,
            "skill": skill,
            "course_recommendations": courses,
            "estimated_duration_hours": skill_hours,
        })

    trajectory = _build_trajectory_graph(target_role, match_percent)

    return {
        "target_role": target_role,
        "match_percent": match_percent,
        "total_skills_to_learn": len(ordered_skills),
        "total_estimated_hours": round(total_hours, 1),
        "roadmap": roadmap_items,
        "trajectory_graph": trajectory,
        "resource_type_filter": resource_type,
    }
