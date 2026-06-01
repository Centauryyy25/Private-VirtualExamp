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

# No test suites exist yet (empty backend/tests/, no frontend test framework)
```

## Architecture

Full-stack exam practice platform: Next.js 16 frontend + FastAPI backend + PostgreSQL 15.

### Backend (`backend/app/`)

- **FastAPI** with async-first design (asyncpg, SQLAlchemy 2.0 async sessions)
- Routes in `api/` → business logic in `services/` → ORM in `models/models.py`
- All routes prefixed `/api` — auth, exams, sessions, preferences
- DB sessions via `Depends(get_db)` with auto commit/rollback
- Auth: JWT HS256 (access 30min + refresh 7d), bcrypt passwords, `get_current_user_id()` dependency
- No Alembic — schema created via `init_db()` at startup; manual migration scripts exist
- Exam data, domain scores, and user answers stored as PostgreSQL JSONB
- Parser registry pattern in `services/parser/__init__.py` — supports OEF/JSON/PDF formats
- Config via Pydantic BaseSettings loading from `backend/.env`

### Frontend (`frontend/src/`)

- **Next.js App Router** with React 19, Tailwind CSS 3, Zustand 5, Recharts 3
- Pages: `/` → `/upload` → `/configure` → `/exam` → `/results`, plus `/dashboard`, `/login`, `/register`, `/demo`
- Two Zustand stores (both persist to localStorage):
  - `examStore` — active session state, question navigation, answers, timer
  - `historyStore` — local exam history (guest fallback, merges with server data for authed users)
- Context providers (`providers.tsx`): `AuthProvider` → `PreferenceProvider`
- API client: singleton `ApiClient` class in `lib/api.ts` — manual fetch, Bearer token from localStorage
- **Hybrid mode**: authenticated users sync with backend; guests use localStorage/sessionStorage fallback
- `next.config.js` has `ignoreBuildErrors: true` — TypeScript errors won't fail builds
- Path alias: `@/*` maps to `src/*`

### Data Flow: Exam Session Lifecycle

1. Upload exam file → backend parses (OEF/JSON/PDF) → stored as JSONB in `Exam` model
2. Configure page sets mode (timed/training), time limit, shuffle, question limit
3. `examStore.startSession()` initializes client-side state
4. During exam: answers tracked in Zustand store, timer managed via `useRef`
5. Submit: authed users POST to `/api/sessions/{id}/submit`; guests write to sessionStorage
6. Results page recalculates scores client-side from exam data + answers (not from backend score)

### Key Models

```
User → has many Exams (uploaded_by) → has many ExamSessions
Exam → has many QuestionAnalytics
ExamSession → stores answers[], domain_scores{} as JSONB
```

### Route ordering note

In `api/sessions.py`, `GET /api/sessions/analytics/summary` must be defined before `GET /api/sessions/{session_id}` to avoid UUID parse conflicts.

## Environment

- Backend: `backend/.env` (see `.env.example`) — `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`
- Frontend: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
- Docker compose provides postgres on :5432, backend on :8000, frontend on :3000
