"""
Exam management API endpoints.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import Exam
from app.schemas.schemas import ExamCreate, ExamResponse, ExamDetailResponse
from app.services.parser.oef_parser import parse_oef_file
from app.services.parser import get_pdf_parser, get_available_pdf_formats

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    exam_data: ExamCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new exam from parsed data."""
    parsed = exam_data.parsed_data
    
    # Extract domains as dict
    domains_dict = {d.id: d.weight for d in parsed.domains} if parsed.domains else None
    
    exam = Exam(
        title=exam_data.title or parsed.metadata.title,
        description=exam_data.description or parsed.metadata.description,
        parsed_data=parsed.model_dump(),
        total_questions=len(parsed.questions),
        pass_percentage=parsed.metadata.pass_percentage,
        time_limit_minutes=parsed.metadata.time_limit_minutes,
        domains=domains_dict,
        uploaded_by=user_id,
        is_public=exam_data.is_public,
    )
    
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    
    return exam


@router.post("/upload", response_model=ExamDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_exam(
    file: UploadFile = File(...),
    is_public: bool = False,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Upload and parse an OEF/JSON exam file."""
    # Validate file extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    extension = file.filename.lower().split(".")[-1]
    if extension not in ["oef", "json"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .oef and .json files are supported."
        )
    
    # Read and parse file
    content = await file.read()
    try:
        parsed_data = parse_oef_file(content)
        # Limit to 100 questions max (User constraint)
        if len(parsed_data.questions) > 100:
            parsed_data.questions = parsed_data.questions[:100]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    
    # Create exam
    domains_dict = {d.id: d.weight for d in parsed_data.domains} if parsed_data.domains else None
    
    exam = Exam(
        title=parsed_data.metadata.title,
        description=parsed_data.metadata.description,
        parsed_data=parsed_data.model_dump(),
        total_questions=len(parsed_data.questions),
        pass_percentage=parsed_data.metadata.pass_percentage,
        time_limit_minutes=parsed_data.metadata.time_limit_minutes,
        domains=domains_dict,
        uploaded_by=user_id,
        is_public=is_public,
        original_file_path=file.filename,
    )
    
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    
    return exam


@router.get("/", response_model=list[ExamResponse])
async def list_exams(
    public_only: bool = False,
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List available exams."""
    query = select(Exam)
    
    if public_only:
        query = query.where(Exam.is_public == True)
    else:
        # Show user's own exams + public exams
        query = query.where((Exam.is_public == True) | (Exam.uploaded_by == user_id))
    
    query = query.offset(skip).limit(limit).order_by(Exam.created_at.desc())
    result = await db.execute(query)
    
    return result.scalars().all()


@router.get("/{exam_id}", response_model=ExamDetailResponse)
async def get_exam(
    exam_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get exam details with questions."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check access
    if not exam.is_public and str(exam.uploaded_by) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete an exam."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if str(exam.uploaded_by) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.delete(exam)
    await db.commit()


@router.get("/formats")
async def list_formats():
    """List available parsing formats."""
    return {
        "file_formats": ["oef", "json", "pdf"],
        "pdf_formats": get_available_pdf_formats(),
    }


@router.post("/upload-pdf", response_model=ExamDetailResponse, status_code=status.HTTP_201_CREATED)
async def upload_exam_pdf(
    file: UploadFile = File(...),
    is_public: bool = False,
    pdf_format: str = "ccna",
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Upload and parse a PDF exam file. Use pdf_format to select parser (ccna, cc)."""
    from app.schemas.schemas import ExamData

    # Validate file extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    extension = file.filename.lower().split(".")[-1]
    if extension != "pdf":
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .pdf files are supported."
        )

    # Get the appropriate parser
    try:
        parser = get_pdf_parser(pdf_format)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Parse PDF using the selected parser
    try:
        raw_data = parser.parse(file.file, file.filename)
        parsed_data = ExamData(**raw_data)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    
    # Create exam record (Reuse logic from upload_exam)
    domains_dict = {d.id: d.weight for d in parsed_data.domains} if parsed_data.domains else None
    
    exam = Exam(
        title=parsed_data.metadata.title,
        description=parsed_data.metadata.description,
        parsed_data=parsed_data.model_dump(),
        total_questions=len(parsed_data.questions),
        pass_percentage=parsed_data.metadata.pass_percentage,
        time_limit_minutes=parsed_data.metadata.time_limit_minutes,
        domains=domains_dict,
        uploaded_by=user_id,
        is_public=is_public,
        original_file_path=file.filename,
    )
    
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    
    return exam
