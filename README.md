# VirtualExamp

Free, open-source web platform for practicing certification exams.

## Features

- 📤 **Easy Upload** - Drag-and-drop .oef or .json exam files
- ⏱️ **Timed Practice** - Configure custom time limits or training mode
- 📊 **Detailed Analytics** - Domain breakdown and score visualizations
- 💾 **Session Recovery** - Auto-save progress to prevent data loss
- 🔒 **Secure** - JWT authentication with refresh tokens

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Zustand, Recharts |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL with JSONB |
| Cache | Redis (optional) |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Configure database
cp .env.example .env
# Edit .env with your database credentials

uvicorn app.main:app --reload
```

### Docker (Recommended for Persistence)

The easiest way to run VirtualExamp with full data persistence:

```bash
docker-compose up -d
```

This will automatically set up:
- **Postgres DB**: With persistent volumes (no data loss on restart)
- **Backend API**: Connected to the internal DB
- **Frontend App**: Built and served on port 3000

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Open Exam Format (OEF)

VirtualExamp uses the Open Exam Format (.oef), a JSON-based structure:

```json
{
  "version": "1.0",
  "metadata": {
    "title": "Exam Title",
    "pass_percentage": 70,
    "time_limit_minutes": 90
  },
  "domains": [
    { "id": "domain-1", "name": "Domain Name", "weight": 25 }
  ],
  "questions": [
    {
      "id": "q001",
      "type": "multiple_choice",
      "domain_id": "domain-1",
      "text": "Question text",
      "options": [
        { "id": "a", "text": "Option A" }
      ],
      "correct_answers": ["a"],
      "explanation": "Why this is correct"
    }
  ]
}
```

See `sample-exam.oef` for a complete example.

## Project Structure

```
VirtualExamp/
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/# React components
│   │   └── lib/       # Utilities & stores
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # API endpoints
│   │   ├── core/      # Config & security
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
└── sample-exam.oef    # Demo exam file
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get token |
| POST | /api/exams/upload | Upload exam file |
| GET | /api/exams | List exams |
| POST | /api/sessions/start | Start exam session |
| POST | /api/sessions/{id}/submit | Submit answers |

## License

MIT License
