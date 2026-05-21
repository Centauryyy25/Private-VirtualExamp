"""
Database models for VirtualExamp.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, ARRAY, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class User(Base):
    """User model for authentication and profile."""
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="user")  # user, admin, premium
    
    # User preferences
    theme_preference: Mapped[str] = mapped_column(String(20), default="system")  # system, light, dark
    season_preference: Mapped[Optional[str]] = mapped_column(String(50))  # For future use
    preferences_json: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)  # Extensible preferences
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    exams: Mapped[list["Exam"]] = relationship("Exam", back_populates="uploader")
    sessions: Mapped[list["ExamSession"]] = relationship("ExamSession", back_populates="user")


class Exam(Base):
    """Exam model storing parsed exam data."""
    __tablename__ = "exams"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    original_file_path: Mapped[Optional[str]] = mapped_column(String(500))
    parsed_data: Mapped[dict] = mapped_column(JSONB, nullable=False)  # Full exam structure
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    pass_percentage: Mapped[int] = mapped_column(Integer, default=70)
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    domains: Mapped[Optional[dict]] = mapped_column(JSONB)  # {"routing": 20, "switching": 15}
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    uploader: Mapped["User"] = relationship("User", back_populates="exams")
    sessions: Mapped[list["ExamSession"]] = relationship("ExamSession", back_populates="exam")
    analytics: Mapped[list["QuestionAnalytics"]] = relationship("QuestionAnalytics", back_populates="exam")


class ExamSession(Base):
    """Exam session tracking user's exam attempt."""
    __tablename__ = "exam_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    exam_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("exams.id"))
    mode: Mapped[str] = mapped_column(String(20), nullable=False)  # timed, training, review
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    passed: Mapped[Optional[bool]] = mapped_column(Boolean)
    user_answers: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    domain_scores: Mapped[Optional[dict]] = mapped_column(JSONB)  # {"routing": 85, "switching": 60}
    time_per_question: Mapped[Optional[dict]] = mapped_column(JSONB)  # [45, 30, 120, ...]
    total_questions: Mapped[Optional[int]] = mapped_column(Integer)
    correct_answers: Mapped[Optional[int]] = mapped_column(Integer)
    flagged_questions: Mapped[Optional[list]] = mapped_column(ARRAY(Integer), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    exam: Mapped["Exam"] = relationship("Exam", back_populates="sessions")


class QuestionAnalytics(Base):
    """Analytics for individual questions."""
    __tablename__ = "question_analytics"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("exams.id"))
    question_index: Mapped[int] = mapped_column(Integer, nullable=False)
    times_answered: Mapped[int] = mapped_column(Integer, default=0)
    times_correct: Mapped[int] = mapped_column(Integer, default=0)
    avg_time_seconds: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    
    # Relationships
    exam: Mapped["Exam"] = relationship("Exam", back_populates="analytics")

    @property
    def difficulty_score(self) -> float:
        """Calculate difficulty based on correct/answered ratio."""
        if self.times_answered == 0:
            return 0.5
        return 1 - (self.times_correct / self.times_answered)
