# VirtualExamp

A free, open-source web application for practicing certification exams.

## Architecture

Full-stack application with two services:

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + Zustand + Recharts
  - Dev server: `http://localhost:3000`
  - Source: `./frontend/src/`
- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + Pydantic v2 + Python 3.11+
  - Dev server: `http://localhost:8000`
  - API docs: `http://localhost:8000/docs`
  - Source: `./backend/app/`
- **Database**: PostgreSQL 15 (JSONB support)

## Running the Project

```bash
# Start all services (Docker)
docker compose up

# Frontend only
cd frontend && npm run dev

# Backend only
cd backend && uvicorn app.main:app --reload
```

## Key Directories

```
frontend/src/
  app/          # Next.js App Router pages
  components/   # React components
  lib/          # Utilities, API clients, stores

backend/app/
  api/          # FastAPI route handlers
  core/         # Config, auth, security
  models/       # SQLAlchemy ORM models
  schemas/      # Pydantic request/response schemas
  services/     # Business logic layer
```

## Key Features

- Drag-and-drop exam upload (`.oef` or `.json` format — see `sample-exam.oef`)
- Timed practice sessions with auto-save/session recovery
- Domain-based analytics with Recharts
- JWT auth (access + refresh tokens), bcrypt password hashing

## Environment

Backend `.env` lives at `./backend/.env` (see `.env.example`).
Frontend env var: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).
