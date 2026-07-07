# SkillGap — Resume vs. Role Analyzer

Upload a resume, pick a target job role, and get an **importance-weighted
compatibility score**, a matched/missing **skill-gap breakdown**, a sequenced
**learning roadmap**, a **career-trajectory** view, and a downloadable **PDF
report**.

The whole stack — FastAPI + MySQL + Redis backend, React + Vite + nginx frontend
— runs with a single Docker Compose command and no manual configuration.

---

## Table of contents

- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [How analysis works](#how-analysis-works)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Configuration](#configuration)
- [Local development (without Docker)](#local-development-without-docker)
- [Ports](#ports)

---

## Quick start

You need [Docker](https://www.docker.com/products/docker-desktop/) (with Compose).
From the repo root:

```bash
docker compose up -d --build
```

That's it — no `.env` or setup required. The compose file ships safe local
defaults, and the backend **auto-generates and persists** its JWT signing key on
first boot (no secret is stored in the repo). Once the containers report healthy:

- **App:** http://localhost:3000
- **API docs (Swagger):** http://localhost:8000/docs

To stop:

```bash
docker compose down          # keep the database
docker compose down -v       # also wipe the database + secret volumes
```

---

## Architecture

The backend follows a strict **layered** design — each request flows down through
the layers, and each layer only knows about the one directly beneath it:

```
HTTP request
   │
   ▼
routes/         FastAPI routers — validate input (Pydantic), map errors → HTTP codes
   │
   ▼
controllers/    Orchestration — coordinate services, shape responses, persist rows
   │
   ▼
services/       Business logic — auth, skill extraction, matching, roadmap, PDF
   │
   ▼
models/ + utils/  SQLAlchemy ORM entities and pure helpers (text, PDF, hashing)
```

Cross-cutting pieces:

- **`middleware/`** — JWT auth dependency, upload validation, global error handlers.
- **`config/`** — DB engine/session factory and Redis client.
- **`utils/model_loader.py`** — loads every ML artifact **once** at startup into
  memory; services read from that cache instead of touching disk per request.

The **frontend** is a React SPA (Vite build) served by nginx. It talks to the
backend over the host-published port (`VITE_API_URL`, baked in at build time).

### Request lifecycle example (analyze a role)

1. `POST /matching/analyze` hits `routes/matching_routes.py` → validates body,
   requires a valid JWT via `get_current_user`.
2. `controllers/matching_controller.py` loads the resume's skills, checks the
   Redis cache, and calls the matching service.
3. `services/matching_service.py` ranks jobs by TF-IDF cosine similarity, then
   computes the importance-weighted skill gap for the target role.
4. The controller persists a `MatchResult`, caches the response, and returns it.

---

## Tech stack

| Layer      | Technology                                                            |
|------------|-----------------------------------------------------------------------|
| Backend    | Python 3.12, FastAPI, Uvicorn                                          |
| Database   | MySQL 8, SQLAlchemy 2 ORM                                              |
| Cache      | Redis (best-effort; the app degrades gracefully if it's down)         |
| Auth       | JWT (python-jose, HS256) + bcrypt password hashing (passlib)          |
| ML / NLP   | spaCy (custom skill NER), scikit-learn (TF-IDF + cosine), numpy/pandas |
| PDF        | PyMuPDF (resume text extraction), WeasyPrint + Jinja2 (report render)  |
| Frontend   | React 19, React Router 7, Vite, Tailwind CSS, Recharts, axios          |
| Serving    | nginx (frontend), Docker Compose (orchestration)                       |

---

## Project structure

```
resumeGap/
├── docker-compose.yml         # 4 services: mysql, redis, backend, frontend
├── .env.example               # optional overrides (defaults work out of the box)
│
├── backend/
│   ├── main.py                # FastAPI app: lifespan (artifact load), CORS, routers
│   ├── routes/                # HTTP endpoints (auth, resume, matching, roadmap, history, report)
│   ├── controllers/           # request orchestration per feature
│   ├── services/              # business logic (auth, skill_extraction, matching, roadmap, pdf_report)
│   ├── models/                # SQLAlchemy ORM: User, Resume, MatchResult, Roadmap
│   ├── middleware/            # auth dependency, upload validator, error handlers
│   ├── config/                # db_config (engine/session), redis_config
│   ├── utils/                 # model_loader, pdf_extractor, text_cleaning, password_hashing
│   ├── ml_artifacts/          # trained models + data (NER model, TF-IDF, job vectors, catalogs)
│   ├── templates/report.html  # Jinja2 template for the PDF report
│   └── db/schema.sql           # table definitions (auto-applied on first mysql boot)
│
└── frontend/
    └── src/
        ├── pages/             # Dashboard, Results, Compare, History, ...
        ├── components/        # MatchRing, SkillBar, TrajectoryGraph, ReportModal, ...
        ├── api/               # axios clients per feature
        ├── context/           # FlowContext, ToastContext
        └── lib/format.js      # status colors, title-casing, duration formatting
```

---

## How analysis works

### 1. Skill extraction (hybrid)

`services/skill_extraction_service.py` runs **two** extractors over the resume
text and takes their union:

- a **trained spaCy NER** model (catches novel phrasings), and
- **exact keyword matching** against the master skill vocabulary (high precision).

The union is stored as `extracted_skills`; the per-source breakdown is kept for
transparency.

### 2. Role matching (ranking)

`match_skills_to_jobs` vectorizes the user's skills with the fitted **TF-IDF
vectorizer** and ranks every job posting by **cosine similarity**. A deduped
variant collapses multiple postings of the same title to the best-scoring one.
Cosine is used **only for ranking** — it is a poor user-facing percentage.

### 3. Compatibility score (importance-weighted coverage)

`compute_skill_gap_clean` computes the number shown in the UI. It is **not**
cosine similarity and **not** a flat matched/required ratio — it is an
**importance-weighted coverage**:

```
match_percent = 100 × Σ weight(matched required skills)
                    / Σ weight(all required skills)
```

Each skill's `weight` is the **mean TF-IDF IDF** of its tokens
(`compute_skill_weights`), so rare/specialized skills (e.g. `kubernetes`) count
far more than generic ones (e.g. `team`). Consequences:

- Missing one *minor* skill barely dents the score (e.g. ~93%), instead of the
  misleadingly low ~20% a raw cosine score would show.
- The response also returns `skill_importance` — each required skill's
  `importance_pct` and whether you have it — which drives the weighted bars in the
  UI (bar width = importance, color = have/missing).

> **Why:** cosine similarity is length-normalized and IDF-weighted in vector
> space, so it never behaves like a coverage ratio. Decoupling "ranking score"
> from "displayed compatibility" fixes that while keeping ranking quality.

### 4. Learning roadmap

`services/roadmap_service.py` takes the missing skills and:

- orders them by prerequisites (a `PREREQUISITE_MAP` topological ordering, so
  foundations come first),
- looks up learning resources (paid catalog + free resources), filterable by
  `resource_type` = `all` | `free` | `paid`, cached in Redis,
- estimates study hours per skill, and
- builds a career-trajectory graph positioned by the current match %.

### 5. PDF report

`services/pdf_report_service.py` renders the analysis into `templates/report.html`
with Jinja2 (autoescaped) and converts it to PDF via WeasyPrint.

### ML artifacts (`backend/ml_artifacts/`)

Loaded once at startup by `utils/model_loader.py`:

| Artifact                       | Purpose                                        |
|--------------------------------|------------------------------------------------|
| `skill_ner_final/`             | trained spaCy NER model — skill extraction     |
| `tfidf_vectorizer.pkl`         | fitted TF-IDF vectorizer — matching + weights  |
| `job_vectors.pkl`              | precomputed job posting vectors                |
| `job_metadata.json`            | job titles + required-skill strings            |
| `master_skills_vocab.json`     | canonical skill vocabulary (noise filter)      |
| `course_catalog.pkl` + index   | paid course recommendations                    |
| `free_resources.json`          | curated free (YouTube etc.) resources          |

If any required artifact is missing or corrupt, the app **fails loudly at
startup** rather than mid-request.

---

## Data model

Four tables (`backend/db/schema.sql`), applied automatically on first MySQL boot.
All child rows cascade-delete with their parent.

```
users (id, email UNIQUE, password_hash, created_at)
  └── resumes (id, user_id→users, raw_text_or_file_path, extracted_skills JSON, extraction_breakdown JSON, uploaded_at)
        └── match_results (id, resume_id→resumes, target_role, match_percent, missing_skills JSON, created_at)
              └── roadmaps (id, match_result_id→match_results, skill, course_recommendations JSON, estimated_duration, sequence_order)
```

---

## API reference

Base URL: `http://localhost:8000`. Interactive docs at `/docs`.
All endpoints except register/login require an `Authorization: Bearer <token>`
header.

| Method | Path                        | Auth | Description                                             |
|--------|-----------------------------|:----:|--------------------------------------------------------|
| POST   | `/auth/register`            |  —   | Create an account, returns an access token.            |
| POST   | `/auth/login`               |  —   | Authenticate, returns an access token.                 |
| GET    | `/resume/skills`            |  ✓   | Type-ahead over the master skill vocabulary.           |
| POST   | `/resume/upload`            |  ✓   | Upload a PDF resume; extract & store skills.           |
| POST   | `/resume/upload-text`       |  ✓   | Same, from pasted resume text.                         |
| GET    | `/matching/roles`           |  ✓   | Type-ahead over available job-role titles.             |
| POST   | `/matching/analyze`         |  ✓   | Analyze one resume against one target role.            |
| POST   | `/matching/compare`         |  ✓   | Analyze one resume against 2–3 roles side by side.     |
| GET    | `/roadmap/{match_result_id}`|  ✓   | Learning roadmap + trajectory (`?resource_type=`).     |
| GET    | `/history/`                 |  ✓   | The user's past resumes and match results.             |
| POST   | `/report/generate`          |  ✓   | Download a PDF report for a match result.              |
| GET    | `/health`                   |  —   | Liveness probe (lists loaded artifacts).               |

### Example

```bash
# 1. Register (returns a bearer token)
TOKEN=$(curl -s -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secret123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Analyze a resume against a role
curl -s -X POST http://localhost:8000/matching/analyze \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"resume_id": 1, "target_role": ".NET Developer"}'
```

Analyze response shape:

```json
{
  "match_result_id": 12,
  "target_role": ".NET Developer",
  "match_percent": 93.28,
  "matched_skills": ["c#", "asp.net", "..."],
  "missing_skills": ["git"],
  "skill_importance": [
    {"skill": "linq", "importance_pct": 14.94, "matched": true},
    {"skill": "git",  "importance_pct": 2.10,  "matched": false}
  ],
  "alternate_suggestions": []
}
```

---

## Configuration

Everything runs on built-in defaults, and the JWT signing key is
**auto-generated and persisted** on first boot — no secret lives in the repo. To
override credentials for a real deployment, copy `.env.example` to `.env` and edit
it; those values are shared by the database and backend so they stay in sync:

```bash
cp .env.example .env
# set real DB passwords; pin JWT_SECRET_KEY only if you need a fixed key
```

| Variable            | Default (compose)        | Used by            | Notes                                                   |
|---------------------|--------------------------|--------------------|---------------------------------------------------------|
| `DB_NAME`           | `skillgap_db`            | mysql + backend    | must match on both sides                                |
| `DB_USER`           | `skillgap_user`          | mysql + backend    |                                                         |
| `DB_PASSWORD`       | `skillgap_pass`          | mysql + backend    | local-only throwaway DB                                 |
| `DB_ROOT_PASSWORD`  | `skillgap_root_pass`     | mysql              |                                                         |
| `JWT_SECRET_KEY`    | *(auto-generated)*       | backend            | set to pin a fixed key (prod / multi-instance)          |
| `JWT_EXPIRY_HOURS`  | `24`                     | backend            |                                                         |
| `FRONTEND_URL`      | `http://localhost:3000`  | backend (CORS)     |                                                         |
| `VITE_API_URL`      | `http://localhost:8000`  | frontend (build)   | baked into the bundle at build time                     |

The auto-generated JWT secret is stored in the `jwt_secret` Docker volume so
issued tokens survive container restarts.

---

## Local development (without Docker)

You can run each service directly for a faster iteration loop. This is where the
per-service `.env` files (`backend/.env`, `frontend/.env`) come in — copy them
from the matching `.env.example`.

**Backend** (needs a reachable MySQL + Redis, and the `ml_artifacts/`):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env          # point DB_HOST/REDIS_HOST at your local services
uvicorn main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env          # set VITE_API_URL if the backend isn't on :8000
npm run dev
```

> Tip: the easiest hybrid is to run `docker compose up -d mysql redis` for the
> infrastructure and run the backend/frontend locally against them.

---

## Ports

| Service  | Host port | Container | Notes                          |
|----------|-----------|-----------|--------------------------------|
| frontend | 3000      | 80        | React app served by nginx      |
| backend  | 8000      | 8000      | FastAPI (`/docs` for Swagger)  |
| mysql    | 3307      | 3306      |                                |
| redis    | 6380      | 6379      |                                |
