# Installation Guide — SkillGap

This guide takes a **fresh machine** to a fully running SkillGap instance. It
covers the recommended Docker path (one command) and a manual, no-Docker path for
development. If you only read one thing, read [Quick install](#quick-install).

---

## Contents

- [System requirements](#system-requirements)
- [Quick install (Docker — recommended)](#quick-install-docker--recommended)
- [Verify the installation](#verify-the-installation)
- [Configuration (optional)](#configuration-optional)
- [Manual install (without Docker)](#manual-install-without-docker)
- [Stopping and cleaning up](#stopping-and-cleaning-up)
- [Troubleshooting](#troubleshooting)

---

## System requirements

| Requirement            | Docker path                          | Manual path                         |
|------------------------|--------------------------------------|-------------------------------------|
| OS                     | Windows / macOS / Linux              | Windows / macOS / Linux             |
| Docker Desktop / Engine| **Required** (with Compose v2)       | Optional (for MySQL + Redis only)   |
| Python                 | not needed on host                   | **3.12**                            |
| Node.js                | not needed on host                   | **18+** (with npm)                  |
| MySQL                  | provided by container                | **8.0** reachable locally           |
| Redis                  | provided by container                | Optional (app degrades gracefully)  |
| Free disk space        | ~3 GB (images + ML artifacts)        | ~2 GB                               |
| Free host ports        | 3000, 8000, 3307, 6380               | 8000, 3000 (+ your DB/Redis ports)  |

> The trained ML artifacts ship **inside the repository** (`backend/ml_artifacts/`),
> so no model download or training step is required.

---

## Quick install (Docker — recommended)

**1. Install Docker Desktop** (includes Compose):
<https://www.docker.com/products/docker-desktop/>

Confirm it works:

```bash
docker --version
docker compose version
```

**2. Clone the repository:**

```bash
git clone https://github.com/vishwaraj008/resumeGap.git
cd resumeGap
```

**3. Build and start everything:**

```bash
docker compose up -d --build
```

This builds and starts four containers — **mysql**, **redis**, **backend**, and
**frontend**. No `.env` file or manual setup is needed: the compose file ships safe
local defaults, the database schema is applied automatically on first boot, and the
backend **auto-generates and persists** its JWT signing key.

First build downloads base images and installs dependencies, so it can take a few
minutes. Subsequent starts are fast.

**4. Wait until the containers report healthy:**

```bash
docker compose ps
```

You should see `mysql`, `redis`, `backend`, and `frontend` all `Up`/`healthy`.

---

## Verify the installation

Once the stack is up:

- **Web app:** <http://localhost:3000>
- **API (Swagger docs):** <http://localhost:8000/docs>
- **Health probe:**

  ```bash
  curl http://localhost:8000/health
  ```

  A healthy response lists the loaded ML artifacts. If it returns an error, the
  backend failed to load a model — see [Troubleshooting](#troubleshooting).

A quick end-to-end smoke test from the terminal:

```bash
# Register a user (returns a bearer token)
curl -s -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'
```

A JSON response containing an `access_token` means the full stack (frontend →
backend → MySQL) is wired correctly. For the full user walkthrough, see
**[USER_MANUAL.md](USER_MANUAL.md)**.

---

## Configuration (optional)

Everything runs on built-in defaults. To override credentials for a real
deployment, copy the example file and edit it — those values are shared by the
database and backend so they stay in sync:

```bash
cp .env.example .env
```

| Variable            | Default (compose)      | Used by         | Notes                                          |
|---------------------|------------------------|-----------------|------------------------------------------------|
| `DB_NAME`           | `skillgap_db`          | mysql + backend | must match on both sides                       |
| `DB_USER`           | `skillgap_user`        | mysql + backend |                                                |
| `DB_PASSWORD`       | `skillgap_pass`        | mysql + backend | local-only throwaway DB                        |
| `DB_ROOT_PASSWORD`  | `skillgap_root_pass`   | mysql           |                                                |
| `JWT_SECRET_KEY`    | *(auto-generated)*     | backend         | set to pin a fixed key (prod / multi-instance) |
| `JWT_EXPIRY_HOURS`  | `24`                   | backend         |                                                |
| `FRONTEND_URL`      | `http://localhost:3000`| backend (CORS)  |                                                |
| `VITE_API_URL`      | `http://localhost:8000`| frontend (build)| baked into the bundle at build time            |

After editing `.env`, rebuild: `docker compose up -d --build`.

---

## Manual install (without Docker)

Use this for a faster development loop. You need a reachable **MySQL 8** and
(optionally) **Redis**. The easiest hybrid is to run just the infrastructure in
Docker and the app locally:

```bash
docker compose up -d mysql redis
```

**Backend** (Python 3.12):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env               # point DB_HOST / REDIS_HOST at your services
uvicorn main:app --reload --port 8000
```

**Frontend** (Node 18+), in a second terminal:

```bash
cd frontend
npm install
cp .env.example .env               # set VITE_API_URL if backend isn't on :8000
npm run dev                        # serves on http://localhost:3000
```

---

## Stopping and cleaning up

```bash
docker compose down          # stop containers, keep the database
docker compose down -v       # also wipe the database + JWT-secret volumes
```

To rebuild from scratch after code changes:

```bash
docker compose up -d --build
```

---

## Troubleshooting

> **First fix to try for almost any startup problem — a clean rebuild.**
> If the backend didn't build, a container won't start, or the app misbehaves after
> an interrupted or partial first build, reset everything and rebuild from scratch:
>
> ```bash
> docker compose down -v && docker compose up -d --build
> ```
>
> `down -v` removes the containers **and** the volumes (including a half-initialized
> MySQL data volume and the JWT-secret volume), and `--build` forces the images to be
> rebuilt. This clears the stale state left behind by a failed or interrupted first
> `docker compose up` — the most common reason the backend fails to build or start on
> a fresh machine.

| Symptom | Cause / Fix |
|---------|-------------|
| **Backend didn't build / container won't start on a fresh machine** | Usually a partial or interrupted first build left stale images and volumes. Do a clean rebuild: `docker compose down -v && docker compose up -d --build`. |
| `port is already allocated` | Another process holds 3000/8000/3307/6380. Stop it, or change the host port in `docker-compose.yml`. |
| Backend container restarts / `/health` fails | An ML artifact failed to load. Confirm `backend/ml_artifacts/` is fully cloned (Git LFS not required — files are committed directly). Check logs: `docker compose logs backend`. |
| Frontend loads but API calls fail | `VITE_API_URL` is baked at build time. If you changed it, rebuild: `docker compose up -d --build`. |
| MySQL "access denied" | Stale volume from an earlier run with different credentials. Reset: `docker compose down -v` then `up`. |
| `docker compose` not found | You have the old standalone `docker-compose`. Install Compose v2 or use `docker-compose up -d --build`. |
| First build is very slow | Normal on first run (image pulls + dependency install). Later starts are fast. |
| View logs for any service | `docker compose logs -f backend` (or `frontend` / `mysql` / `redis`). |
