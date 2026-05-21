"""
Exam session API endpoints.
"""
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import Exam, ExamSession, QuestionAnalytics
from app.schemas.schemas import (
    SessionStart, SessionSubmit, SessionResult, SessionResponse,
    SessionDetailResponse, SessionListResponse, DomainScore,
)
from app.services.analytics.score_calculator import (
    calculate_session_result, get_performance_summary, update_question_analytics,
)

router = APIRouter(prefix="/sessions", tags=["Exam Sessions"])


@router.post("/start", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    session_data: SessionStart,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Start a new exam session."""
    # Get exam
    result = await db.execute(select(Exam).where(Exam.id == session_data.exam_id))
    exam = result.scalar_one_or_none()

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Check access
    if not exam.is_public and str(exam.uploaded_by) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Determine time limit
    time_limit = session_data.time_limit_minutes
    if session_data.mode == "timed" and not time_limit:
        time_limit = exam.time_limit_minutes or 90  # Default 90 minutes

    # Create session
    session = ExamSession(
        user_id=user_id,
        exam_id=session_data.exam_id,
        mode=session_data.mode,
        time_limit_minutes=time_limit if session_data.mode == "timed" else None,
        start_time=datetime.now(timezone.utc),
        user_answers=[],
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return session


# NOTE: analytics routes MUST be before /{session_id} to avoid UUID parse conflict
@router.get("/analytics/summary")
async def get_analytics_summary(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated performance analytics for the current user."""
    # Fetch all completed sessions
    result = await db.execute(
        select(ExamSession)
        .where(ExamSession.user_id == user_id, ExamSession.end_time.isnot(None))
        .order_by(ExamSession.start_time.desc())
    )
    sessions = result.scalars().all()

    # Build session dicts for get_performance_summary
    session_dicts = []
    all_domain_scores: dict[str, list[float]] = {}
    for s in sessions:
        time_taken = int((s.end_time - s.start_time).total_seconds()) if s.end_time and s.start_time else 0
        session_dicts.append({
            "score": float(s.score) if s.score is not None else 0,
            "passed": s.passed,
            "time_taken_seconds": time_taken,
        })
        # Aggregate domain scores
        if s.domain_scores:
            for domain_id, score_val in s.domain_scores.items():
                if domain_id not in all_domain_scores:
                    all_domain_scores[domain_id] = []
                all_domain_scores[domain_id].append(float(score_val))

    summary = get_performance_summary(session_dicts)

    # Compute weak domains (avg < 60%)
    weak_domains = []
    for domain_id, scores in all_domain_scores.items():
        avg = sum(scores) / len(scores) if scores else 0
        if avg < 60:
            weak_domains.append({
                "domain_id": domain_id,
                "domain_name": domain_id,  # We only have the ID in domain_scores JSONB
                "avg_score": round(avg, 2),
            })

    summary["weak_domains"] = weak_domains
    return summary


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get session details."""
    result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if str(session.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return session


@router.post("/{session_id}/submit", response_model=SessionResult)
async def submit_session(
    session_id: UUID,
    submission: SessionSubmit,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Submit exam session for scoring."""
    # Get session
    result = await db.execute(select(ExamSession).where(ExamSession.id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if str(session.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if session.end_time:
        raise HTTPException(status_code=400, detail="Session already submitted")

    # Get exam for correct answers
    exam_result = await db.execute(select(Exam).where(Exam.id == session.exam_id))
    exam = exam_result.scalar_one()

    # Calculate result
    end_time = datetime.now(timezone.utc)
    result_data = calculate_session_result(
        exam_data=exam.parsed_data,
        user_answers=[a.model_dump() for a in submission.answers],
        start_time=session.start_time,
        end_time=end_time,
    )

    # Update session
    session.end_time = end_time
    session.user_answers = [a.model_dump() for a in submission.answers]
    session.score = result_data["score"]
    session.passed = result_data["passed"]
    session.domain_scores = result_data["domain_scores"]
    session.time_per_question = result_data["time_per_question"]
    session.total_questions = result_data["total_questions"]
    session.correct_answers = result_data["correct_answers"]

    # Update question analytics
    await update_question_analytics(
        db=db,
        exam_id=session.exam_id,
        exam_data=exam.parsed_data,
        user_answers=[a.model_dump() for a in submission.answers],
    )

    await db.commit()
    await db.refresh(session)

    # Build response
    domain_scores = [
        DomainScore(
            domain_id=ds["domain_id"],
            domain_name=ds["domain_name"],
            score=ds["score"],
            total_questions=ds["total_questions"],
            correct_answers=ds["correct_answers"],
        )
        for ds in result_data["domain_scores_list"]
    ]

    return SessionResult(
        id=session.id,
        exam_id=session.exam_id,
        mode=session.mode,
        score=result_data["score"],
        passed=result_data["passed"],
        total_questions=result_data["total_questions"],
        correct_answers=result_data["correct_answers"],
        time_taken_seconds=result_data["time_taken_seconds"],
        domain_scores=domain_scores,
        start_time=session.start_time,
        end_time=end_time,
    )


@router.get("/", response_model=list[SessionListResponse])
async def list_sessions(
    exam_id: UUID = None,
    skip: int = 0,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List user's exam sessions with enriched exam info."""
    query = (
        select(ExamSession)
        .options(selectinload(ExamSession.exam))
        .where(ExamSession.user_id == user_id)
    )

    if exam_id:
        query = query.where(ExamSession.exam_id == exam_id)

    query = query.offset(skip).limit(limit).order_by(ExamSession.start_time.desc())
    result = await db.execute(query)
    sessions = result.scalars().all()

    # Transform to SessionListResponse with computed fields
    response = []
    for s in sessions:
        time_taken = None
        if s.end_time and s.start_time:
            time_taken = int((s.end_time - s.start_time).total_seconds())

        response.append(SessionListResponse(
            id=s.id,
            exam_id=s.exam_id,
            exam_title=s.exam.title if s.exam else "Unknown Exam",
            mode=s.mode,
            start_time=s.start_time,
            end_time=s.end_time,
            score=s.score,
            passed=s.passed,
            total_questions=s.total_questions or (s.exam.total_questions if s.exam else None),
            correct_answers=s.correct_answers,
            domain_scores=s.domain_scores,
            time_taken_seconds=time_taken,
        ))

    return response
