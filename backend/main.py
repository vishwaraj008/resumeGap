"""
FastAPI application entrypoint for the Skill-Gap Career Path Recommender.

Wires the whole backend together:
  * loads environment (.env) before anything else imports config,
  * on startup (`lifespan`) loads every ML artifact into memory once and checks
    Redis reachability — failing loudly if a required artifact is missing,
  * mounts CORS for the React frontend,
  * registers the six feature routers (auth, resume, matching, roadmap, history,
    report) and the global error handlers.

Run with: `uvicorn main:app --host 0.0.0.0 --port 8000`.
"""
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from utils.model_loader import load_all_artifacts
from config.redis_config import is_redis_available

from routes.auth_routes import router as auth_router
from routes.resume_routes import router as resume_router
from routes.matching_routes import router as matching_router
from routes.roadmap_routes import router as roadmap_router
from routes.history_routes import router as history_router
from routes.report_routes import router as report_router

from middleware.error_handler import register_error_handlers

ml_artifacts = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs once at startup: loads all ML artifacts into memory, checks Redis/DB reachability.
    Fails loudly if a required artifact is missing — see PRD Section 6.1."""
    print("Starting up: loading ML artifacts...")
    ml_artifacts.update(load_all_artifacts())
    print(f"Loaded {len(ml_artifacts)} artifact groups successfully.")

    if is_redis_available():
        print("Redis connection OK.")
    else:
        print("WARNING: Redis unreachable at startup — app will degrade to direct DB access for cached operations.")

    yield  # app runs here

    print("Shutting down.")


app = FastAPI(title="Skill-Gap Career Path Recommender API", lifespan=lifespan)

import os

# CORS — allows the React frontend (different origin/container) to call this API
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],  # tighten this to your actual frontend URL before final submission
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(resume_router, prefix="/resume", tags=["Resume"])
app.include_router(matching_router, prefix="/matching", tags=["Matching"])
app.include_router(roadmap_router, prefix="/roadmap", tags=["Roadmap"])
app.include_router(history_router, prefix="/history", tags=["History"])
app.include_router(report_router, prefix="/report", tags=["Report"])

register_error_handlers(app)


@app.get("/health")
def health_check():
    """Basic liveness check — useful for confirming the container is up during Docker debugging."""
    return {"status": "ok", "artifacts_loaded": list(ml_artifacts.keys())}