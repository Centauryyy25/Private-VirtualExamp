"""
Score calculation and analytics service.
"""
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def calculate_session_result(
    exam_data: dict[str, Any],
    user_answers: list[dict[str, Any]],
    start_time: datetime,
    end_time: datetime,
) -> dict[str, Any]:
    """Calculate exam session result with domain breakdown."""
    questions = exam_data.get("questions", [])
    domains = exam_data.get("domains", [])
    pass_percentage = exam_data.get("metadata", {}).get("pass_percentage", 70)
    
    # Build answer lookup
    answer_map = {a["question_id"]: a for a in user_answers}
    
    # Initialize domain tracking
    domain_stats = {}
    for d in domains:
        domain_stats[d["id"]] = {
            "domain_id": d["id"],
            "domain_name": d["name"],
            "total": 0,
            "correct": 0,
        }
    
    # Add "unassigned" domain for questions without domain_id
    domain_stats["_unassigned"] = {
        "domain_id": "_unassigned",
        "domain_name": "General",
        "total": 0,
        "correct": 0,
    }
    
    # Calculate scores
    total_questions = len(questions)
    correct_answers = 0
    time_per_question = []
    
    for q in questions:
        q_id = q["id"]
        correct_answer = set(q.get("correct_answers", []))
        domain_id = q.get("domain_id", "_unassigned")
        
        # Ensure domain exists in stats
        if domain_id not in domain_stats:
            domain_stats[domain_id] = {
                "domain_id": domain_id,
                "domain_name": domain_id,
                "total": 0,
                "correct": 0,
            }
        
        domain_stats[domain_id]["total"] += 1
        
        # Check user's answer
        user_answer_data = answer_map.get(q_id)
        if user_answer_data:
            user_selection = set(user_answer_data.get("answer", []))
            time_spent = user_answer_data.get("time_spent_seconds", 0)
            time_per_question.append(time_spent)
            
            # Check if correct (exact match for all correct answers)
            if user_selection == correct_answer:
                correct_answers += 1
                domain_stats[domain_id]["correct"] += 1
        else:
            time_per_question.append(0)
    
    # Calculate overall score
    score = (correct_answers / total_questions * 100) if total_questions > 0 else 0
    passed = score >= pass_percentage
    
    # Calculate domain scores
    domain_scores = {}
    domain_scores_list = []
    
    for domain_id, stats in domain_stats.items():
        if stats["total"] > 0:
            domain_score = (stats["correct"] / stats["total"]) * 100
            domain_scores[domain_id] = round(domain_score, 2)
            domain_scores_list.append({
                "domain_id": domain_id,
                "domain_name": stats["domain_name"],
                "score": round(domain_score, 2),
                "total_questions": stats["total"],
                "correct_answers": stats["correct"],
            })
    
    # Calculate time taken
    time_taken_seconds = int((end_time - start_time).total_seconds())
    
    return {
        "score": round(score, 2),
        "passed": passed,
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "time_taken_seconds": time_taken_seconds,
        "domain_scores": domain_scores,
        "domain_scores_list": domain_scores_list,
        "time_per_question": time_per_question,
    }


async def update_question_analytics(
    db: AsyncSession,
    exam_id: UUID,
    exam_data: dict[str, Any],
    user_answers: list[dict[str, Any]],
) -> None:
    """Upsert QuestionAnalytics rows based on a submitted session."""
    from app.models.models import QuestionAnalytics

    questions = exam_data.get("questions", [])
    answer_map = {a["question_id"]: a for a in user_answers}

    for idx, q in enumerate(questions):
        q_id = q["id"]
        correct_answer = set(q.get("correct_answers", []))
        user_answer_data = answer_map.get(q_id)

        is_correct = False
        time_spent = 0
        if user_answer_data:
            user_selection = set(user_answer_data.get("answer", []))
            is_correct = user_selection == correct_answer
            time_spent = user_answer_data.get("time_spent_seconds", 0)

        # Look up existing analytics row
        result = await db.execute(
            select(QuestionAnalytics).where(
                QuestionAnalytics.exam_id == exam_id,
                QuestionAnalytics.question_index == idx,
            )
        )
        analytics = result.scalar_one_or_none()

        if analytics:
            old_total = analytics.times_answered
            analytics.times_answered += 1
            analytics.times_correct += 1 if is_correct else 0
            analytics.avg_time_seconds = (
                ((analytics.avg_time_seconds or 0) * old_total + time_spent)
                / analytics.times_answered
            )
        else:
            analytics = QuestionAnalytics(
                exam_id=exam_id,
                question_index=idx,
                times_answered=1,
                times_correct=1 if is_correct else 0,
                avg_time_seconds=time_spent,
            )
            db.add(analytics)


def calculate_difficulty(times_answered: int, times_correct: int) -> float:
    """Calculate question difficulty score (0-1, higher = harder)."""
    if times_answered == 0:
        return 0.5  # Default medium difficulty
    return round(1 - (times_correct / times_answered), 2)


def get_weak_domains(domain_scores: list[dict], threshold: float = 60.0) -> list[dict]:
    """Get domains where user scored below threshold."""
    return [d for d in domain_scores if d["score"] < threshold]


def get_performance_summary(sessions: list[dict]) -> dict[str, Any]:
    """Generate performance summary from multiple sessions."""
    if not sessions:
        return {
            "total_exams": 0,
            "pass_rate": 0,
            "average_score": 0,
            "total_time_hours": 0,
        }
    
    total_exams = len(sessions)
    passed_exams = sum(1 for s in sessions if s.get("passed"))
    total_score = sum(s.get("score", 0) for s in sessions)
    total_time = sum(s.get("time_taken_seconds", 0) for s in sessions)
    
    return {
        "total_exams": total_exams,
        "pass_rate": round((passed_exams / total_exams) * 100, 2),
        "average_score": round(total_score / total_exams, 2),
        "total_time_hours": round(total_time / 3600, 2),
    }
