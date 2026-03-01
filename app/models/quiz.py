from typing import List, Optional

from pydantic import BaseModel


class QuizSource(BaseModel):
    title: Optional[str] = None
    content: str


class QuizRequest(BaseModel):
    topics: List[str]
    sources: List[QuizSource]
    num_questions: int = 10
    difficulty: str = "mixed"  # easy, medium, hard, or mixed


class QuizQuestion(BaseModel):
    question: str
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]

