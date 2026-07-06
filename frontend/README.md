# SkillPath — Frontend

React (Vite) frontend for the Skill-Gap Career Path Recommender. All data is served
dynamically by the FastAPI backend — no roles, skills, or results are hardcoded.

## Stack
- React 19 + Vite
- React Router
- Tailwind CSS (tokens from `stitch_designs/skillpath/DESIGN.md`)
- Axios (JWT bearer interceptor)
- Recharts (comparison bar chart)

## Run locally (dev)
The backend must be running on `http://localhost:8000` (see `../backend`).

```bash
npm install
npm run dev        # serves on http://localhost:3000
```

The dev server runs on port **3000** to match the backend's default CORS origin.
Configure the API base URL in `.env`:

```
VITE_API_URL=http://localhost:8000
```

## Run with Docker
From the repo root, the whole stack (frontend + backend + mysql + redis) comes up with:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API + docs: http://localhost:8000/docs

## Structure
```
src/
  api/         axios client + one module per backend resource
  context/     Auth, Flow (multi-step state), Toast
  components/  layout + reusable UI (MatchRing, SkillBar, Autocomplete, Modal, ...)
  pages/       Login, Dashboard, AddSkills, ChooseRole, Results, Compare, History, Profile
  lib/         jwt decode, formatting helpers
```

## App flow
Login → Add Skills (PDF upload or manual entry with live autocomplete) →
Choose Role (live role search, single or 2–3 role compare) →
Results (Overview · Learning Roadmap · Career Path) → PDF report / History.
