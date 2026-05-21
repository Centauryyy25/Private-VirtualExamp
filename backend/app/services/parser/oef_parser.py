"""
OEF (Open Exam Format) file parser.
"""
import json
from typing import Any

from app.schemas.schemas import ExamData, ExamMetadata, Domain, Question, QuestionOption


def parse_oef_file(content: bytes) -> ExamData:
    """Parse OEF/JSON file content into ExamData."""
    try:
        data = json.loads(content.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON format: {str(e)}")
    
    return parse_oef_dict(data)


def parse_oef_dict(data: dict[str, Any]) -> ExamData:
    """Parse OEF dictionary into ExamData."""
    # Validate required fields
    if "metadata" not in data:
        raise ValueError("Missing 'metadata' field")
    if "questions" not in data:
        raise ValueError("Missing 'questions' field")
    
    # Parse metadata
    meta = data["metadata"]
    metadata = ExamMetadata(
        title=meta.get("title", "Untitled Exam"),
        vendor=meta.get("vendor"),
        exam_code=meta.get("exam_code"),
        pass_percentage=meta.get("pass_percentage", 70),
        time_limit_minutes=meta.get("time_limit_minutes"),
        description=meta.get("description"),
    )
    
    # Parse domains
    domains = []
    for d in data.get("domains", []):
        domains.append(Domain(
            id=d["id"],
            name=d["name"],
            weight=d.get("weight", 0),
        ))
    
    # Parse questions
    questions = []
    for q in data["questions"]:
        options = []
        for opt in q.get("options", []):
            if isinstance(opt, dict):
                options.append(QuestionOption(
                    id=opt["id"],
                    text=opt["text"],
                ))
            else:
                # Simple string options (legacy format)
                options.append(QuestionOption(
                    id=str(opt),
                    text=str(opt),
                ))
        
        questions.append(Question(
            id=q["id"],
            type=q.get("type", "multiple_choice"),
            domain_id=q.get("domain_id"),
            text=q["text"],
            media=q.get("media", []),
            options=options,
            correct_answers=q["correct_answers"],
            explanation=q.get("explanation"),
            references=q.get("references", []),
        ))
    
    return ExamData(
        version=data.get("version", "1.0"),
        metadata=metadata,
        domains=domains,
        questions=questions,
    )


def validate_oef_structure(data: dict[str, Any]) -> list[str]:
    """Validate OEF structure and return list of errors."""
    errors = []
    
    # Check metadata
    if "metadata" not in data:
        errors.append("Missing 'metadata' field")
    else:
        meta = data["metadata"]
        if "title" not in meta:
            errors.append("Missing 'metadata.title' field")
        if "pass_percentage" in meta:
            pp = meta["pass_percentage"]
            if not isinstance(pp, int) or pp < 0 or pp > 100:
                errors.append("'pass_percentage' must be an integer between 0 and 100")
    
    # Check questions
    if "questions" not in data:
        errors.append("Missing 'questions' field")
    elif not isinstance(data["questions"], list):
        errors.append("'questions' must be an array")
    elif len(data["questions"]) == 0:
        errors.append("'questions' array cannot be empty")
    else:
        for i, q in enumerate(data["questions"]):
            prefix = f"questions[{i}]"
            if "id" not in q:
                errors.append(f"{prefix}: Missing 'id' field")
            if "text" not in q:
                errors.append(f"{prefix}: Missing 'text' field")
            if "correct_answers" not in q:
                errors.append(f"{prefix}: Missing 'correct_answers' field")
            elif not isinstance(q["correct_answers"], list):
                errors.append(f"{prefix}: 'correct_answers' must be an array")
    
    return errors
