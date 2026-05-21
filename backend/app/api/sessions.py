"""
Exam session API endpoints.
"""
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import Exam, ExamSession
from app.schemas.schemas import SessionStart, SessionSubmit, SessionResult, SessionResponse, DomainScore
from app.services.analytics.score_calculator import calculate_session_result

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


@router.get("/{session_id}", response_model=SessionResponse)
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


@router.get("/", response_model=list[SessionResponse])
async def list_sessions(
    exam_id: UUID = None,
    skip: int = 0,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List user's exam sessions."""
    query = select(ExamSession).where(ExamSession.user_id == user_id)
    
    if exam_id:
        query = query.where(ExamSession.exam_id == exam_id)
    
    query = query.offset(skip).limit(limit).order_by(ExamSession.start_time.desc())
    result = await db.execute(query)
    
    return result.scalars().all()
