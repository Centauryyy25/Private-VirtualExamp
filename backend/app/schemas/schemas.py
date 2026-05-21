"""
Pydantic schemas for API request/response validation.
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from uuid import UUID


# =============================================================================
# User Schemas
# =============================================================================

class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    email: str
    display_name: Optional[str]
    role: str
    theme_preference: str = "system"
    season_preference: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# =============================================================================
# Exam Schemas
# =============================================================================

class QuestionOption(BaseModel):
    """Schema for question option."""
    id: str
    text: str


class Question(BaseModel):
    """Schema for exam question."""
    id: str
    type: str  # multiple_choice, drag_drop, fill_blank, etc.
    domain_id: Optional[str] = None
    text: str
    media: list[str] = []
    options: list[QuestionOption] = []
    correct_answers: list[str]
    explanation: Optional[str] = None
    references: list[str] = []


class Domain(BaseModel):
    """Schema for exam domain."""
    id: str
    name: str
    weight: int = 0


class ExamMetadata(BaseModel):
    """Schema for exam metadata."""
    title: str
    vendor: Optional[str] = None
    exam_code: Optional[str] = None
    pass_percentage: int = 70
    time_limit_minutes: Optional[int] = None
    description: Optional[str] = None


class ExamData(BaseModel):
    """Schema for complete exam data (OEF format)."""
    version: str = "1.0"
    metadata: ExamMetadata
    domains: list[Domain] = []
    questions: list[Question]


class ExamCreate(BaseModel):
    """Schema for creating an exam."""
    title: str = Field(max_length=255)
    description: Optional[str] = None
    parsed_data: ExamData
    is_public: bool = False


class ExamResponse(BaseModel):
    """Schema for exam response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    title: str
    description: Optional[str]
    total_questions: int
    pass_percentage: int
    time_limit_minutes: Optional[int]
    domains: Optional[dict]
    is_public: bool
    created_at: datetime


class ExamDetailResponse(ExamResponse):
    """Schema for detailed exam response with questions."""
    parsed_data: dict


# =============================================================================
# Exam Session Schemas
# =============================================================================

class SessionStart(BaseModel):
    """Schema for starting an exam session."""
    exam_id: UUID
    mode: str = Field(pattern="^(timed|training|review)$")
    time_limit_minutes: Optional[int] = None


class UserAnswer(BaseModel):
    """Schema for user's answer to a question."""
    question_id: str
    answer: list[str]  # List of selected option IDs
    time_spent_seconds: int = 0
    flagged: bool = False


class SessionSubmit(BaseModel):
    """Schema for submitting exam session."""
    answers: list[UserAnswer]


class DomainScore(BaseModel):
    """Schema for domain score."""
    domain_id: str
    domain_name: str
    score: float
    total_questions: int
    correct_answers: int


class SessionResult(BaseModel):
    """Schema for exam session result."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    exam_id: UUID
    mode: str
    score: float
    passed: bool
    total_questions: int
    correct_answers: int
    time_taken_seconds: int
    domain_scores: list[DomainScore]
    start_time: datetime
    end_time: datetime


class SessionResponse(BaseModel):
    """Schema for session response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    exam_id: UUID
    mode: str
    start_time: datetime
    end_time: Optional[datetime]
    score: Optional[float]
    passed: Optional[bool]
