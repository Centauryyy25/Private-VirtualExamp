# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start all services (Docker)
docker compose up

# Frontend
cd frontend && npm install        # install deps
cd frontend && npm run dev        # dev server on :3000
cd frontend && npm run build      # production build
cd frontend && npm run lint       # ESLint (flat config, Next.js core-web-vitals + TS)

# Backend
cd backend && pip install -r requirements.txt
cd backend && uvicorn app.main:app --reload   # dev server on :8000

# Database migrations (no Alembic — run manually when needed)
cd backend && python migrate_session_columns.py
cd backend && python migrate_user_preferences.py

# No test suites exist yet (empty backend/tests/, no frontend test framework)
```

### Production Deployment (CasaOS)

```bash
./deploy.sh             # rebuild images + redeploy, then run health checks
./deploy.sh --no-build  # redeploy without rebuilding (config-only change)
```

Uses `docker-compose.casaos.yml` with `--env-file .env.production` (required — Compose
interpolates `${POSTGRES_PASSWORD}`, `${SECRET_KEY}`, `${SERVER_IP}`, `${CORS_ORIGINS}` from
that file at the top level, *not* from each service's `env_file:` directive; missing it makes
the backend fail with "password authentication failed for user postgres"). Container names are
`virtualexamp-{db,backend,frontend}`. `deploy.sh` exits non-zero and dumps backend logs if
`/docs` or `/` don't return 200.

## Architecture

Full-stack exam practice platform: Next.js 16 frontend + FastAPI backend + PostgreSQL 15.

### Backend (`backend/app/`)

- **FastAPI** with async-first design (asyncpg, SQLAlchemy 2.0 async sessions)
- Routes in `api/` → business logic in `services/` → ORM in `models/models.py`
- All routes prefixed `/api` — auth, exams, sessions, preferences
- DB sessions via `Depends(get_db)` with auto commit/rollback
- Auth: JWT HS256 (access 30min + refresh 7d), bcrypt passwords, `get_current_user_id()` dependency
- No Alembic — schema created via `init_db()` at startup; manual migration scripts exist at repo root of `backend/`
- Exam data, domain scores, and user answers stored as PostgreSQL JSONB
- Config via Pydantic `BaseSettings` loading from `backend/.env`; `CORS_ORIGINS` is required (no default)

#### Layer: Schemas (`app/schemas/schemas.py`)

All API request/response types are Pydantic v2 models. The core exam data structure is `ExamData` → `ExamMetadata` + `Domain[]` + `Question[]`. `Question.correct_answers` is a list of option IDs (exact-match for scoring). `SessionSubmit` accepts `UserAnswer[]` with `question_id`, `answer: list[str]`, `time_spent_seconds`, `flagged`.

#### Layer: Parser Service (`app/services/parser/`)

Registry pattern for PDF parsers in `__init__.py`. Two PDF formats registered:
- `"ccna"` → `app/services/pdf_parser.py` (CCNA-style PDFs)
- `"cc"` → `app/services/parser/cc_parser.py` (CC exam PDFs)

OEF/JSON files are parsed by `services/parser/oef_parser.py` (not in the registry). Upload endpoint `POST /api/exams/upload` handles `.oef`/`.json`; `POST /api/exams/upload-pdf` requires `pdf_format` form field. OEF uploads are capped at 100 questions.

#### Layer: Score Calculation (`app/services/analytics/score_calculator.py`)

Scores only the questions the user was presented with (matched by `question_id` in submitted answers). Questions without a `domain_id` are bucketed under `"_unassigned"` / "General". Domain scores are stored as `{domain_id: score_pct}` JSONB; the full breakdown list is computed at submit time and not re-stored.

### Frontend (`frontend/src/`)

- **Next.js App Router** with React 19, Tailwind CSS 3, Zustand 5, Recharts 3
- Pages: `/` → `/upload` → `/configure` → `/exam` → `/results`, plus `/dashboard`, `/login`, `/register`, `/demo`
- Two Zustand stores (both persist to localStorage):
  - `examStore` (`lib/store/examStore.ts`) — active session state, question navigation, answers, timer. `startSession()` applies shuffle (Fisher-Yates) and question limit at start time, mutating the exam's questions array in store.
  - `historyStore` (`lib/store/historyStore.ts`) — local exam history (guest fallback, merges with server data for authed users)
- Context providers (`providers.tsx`): `AuthProvider` → `PreferenceProvider`
- `AuthProvider` (`lib/auth-context.tsx`) reads `access_token` from localStorage on mount; auto-login after registration
- API client: singleton `ApiClient` class in `lib/api.ts` — manual fetch, Bearer token from localStorage
- **Hybrid mode**: authenticated users sync with backend; guests use localStorage/sessionStorage fallback
- `next.config.js` has `ignoreBuildErrors: true` — TypeScript errors won't fail builds
- Path alias: `@/*` maps to `src/*`

### Data Flow: Exam Session Lifecycle

1. Upload exam file → backend parses (OEF/JSON/PDF) → stored as JSONB in `Exam` model
2. Configure page sets mode (timed/training), time limit, shuffle, question limit
3. `examStore.startSession()` initializes client-side state (applies shuffle + limit here, not before)
4. During exam: answers tracked in Zustand store, timer managed via `useRef`
5. Submit: authed users POST to `/api/sessions/{id}/submit`; guests write to sessionStorage
6. Results page recalculates scores client-side from exam data + answers (not from backend score)

### Key Models

```
User → has many Exams (uploaded_by) → has many ExamSessions
Exam → has many QuestionAnalytics
ExamSession → stores answers[], domain_scores{} as JSONB
```

`ExamSession.flagged_questions` uses `ARRAY(Integer)` (Postgres array, not JSONB). `ExamSession.user_answers` stores the raw `UserAnswer` dicts. `QuestionAnalytics` tracks per-question difficulty via `times_answered`/`times_correct`.

### Route Ordering Note

In `api/sessions.py`, `GET /api/sessions/analytics/summary` **must** be defined before `GET /api/sessions/{session_id}` to avoid UUID parse conflicts with the literal path segment "analytics".

### Standalone Tools (`backend/tools/`)

Standalone development/debug scripts not imported by the app: `pdf_exam_parser.py`, `debug_regex.py`, `vce_investigator.py`. Run directly with Python for parsing investigation.

## OEF Format

`.oef` files are JSON with a `.oef` extension. Required fields: `metadata.title`, `questions[].id`, `questions[].text`, `questions[].correct_answers`. See `sample-exam.oef` at repo root for a complete example.

## Environment

- Backend: `backend/.env` (see `.env.example`) — `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` (required)
- Frontend: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
- Docker compose provides postgres on :5432, backend on :8000, frontend on :3000
- API docs available at `http://localhost:8000/docs` when backend is running
- Production: `.env.production` at repo root (not committed) supplies `POSTGRES_PASSWORD`, `SECRET_KEY`, `SERVER_IP`, `CORS_ORIGINS`; `data/` holds the production postgres + uploads bind mounts (untracked)
