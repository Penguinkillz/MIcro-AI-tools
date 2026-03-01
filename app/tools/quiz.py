import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from openai import OpenAI

from app.config import get_settings
from app.models.quiz import QuizQuestion, QuizRequest, QuizResponse, QuizSource
from app.utils.file_extract import extract_text_from_file


router = APIRouter(prefix="/quiz", tags=["quiz"])


def _build_prompt(payload: QuizRequest) -> str:
    topics_text = "\n".join(f"- {t}" for t in payload.topics)

    sources_text_parts: List[str] = []
    for idx, source in enumerate(payload.sources, start=1):
        title = source.title or f"Source {idx}"
        sources_text_parts.append(f"{title}:\n{source.content}")
    sources_text = "\n\n".join(sources_text_parts)

    prompt = f"""
You are an expert quiz generator.

Generate a quiz strictly based on the provided topics and sources.

Requirements:
- Number of questions: {payload.num_questions}
- Difficulty: {payload.difficulty} (easy, medium, hard, or mixed)
- Prefer multiple-choice questions with 4 options when possible.
- Each question must have:
  - question: the question text
  - options: an array of answer options (if multiple-choice)
  - answer: the correct answer (either the correct option text or a short free-form answer)
  - explanation: a short explanation referencing the sources

Return ONLY valid JSON with this exact shape:
{{
  "questions": [
    {{
      "question": "string",
      "options": ["string", "..."],
      "answer": "string",
      "explanation": "string"
    }}
  ]
}}

Topics:
{topics_text}

Sources:
{sources_text}
"""
    return prompt.strip()


def _parse_quiz_response(content: str) -> Dict[str, Any]:
    """
    Try to parse JSON from the model output.
    If the model wraps JSON in extra text, attempt to extract the JSON block.
    """
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Attempt to extract the first JSON object from the text
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            snippet = content[start : end + 1]
            try:
                return json.loads(snippet)
            except json.JSONDecodeError:
                pass
        raise


def _call_llm(payload: QuizRequest) -> QuizResponse:
    """Shared logic: build prompt, call LLM, parse response."""
    settings = get_settings()

    use_groq = bool(settings.groq_api_key)
    api_key = settings.groq_api_key or settings.openai_api_key

    if not api_key:
        raise HTTPException(status_code=500, detail="No API key configured.")

    if use_groq:
        # Groq exposes an OpenAI-compatible API.
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        model_name = "llama-3.3-70b-versatile"
    else:
        client = OpenAI(api_key=api_key)
        model_name = "gpt-4o-mini"

    prompt = _build_prompt(payload)

    try:
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a focused quiz generator that returns clean JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )
    except Exception as exc:  # pragma: no cover - network/API failure
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {exc}") from exc

    try:
        raw_content = completion.choices[0].message.content or ""
    except (AttributeError, IndexError) as exc:
        raise HTTPException(status_code=502, detail="Invalid response from OpenAI API.") from exc

    try:
        data = _parse_quiz_response(raw_content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse quiz JSON from model output: {exc}",
        ) from exc

    questions_data = data.get("questions")
    if not isinstance(questions_data, list):
        raise HTTPException(status_code=502, detail="Model JSON missing 'questions' list.")

    questions: List[QuizQuestion] = []
    for item in questions_data:
        try:
            questions.append(QuizQuestion(**item))
        except Exception:
            # Skip malformed questions instead of failing the whole quiz
            continue

    if not questions:
        raise HTTPException(status_code=502, detail="No valid questions generated.")

    return QuizResponse(questions=questions)


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(payload: QuizRequest) -> QuizResponse:
    """Generate quiz from JSON body (topics + text sources)."""
    return _call_llm(payload)


@router.post("/generate-from-files", response_model=QuizResponse)
async def generate_quiz_from_files(
    topics: str = Form(..., description="Topics, one per line or comma-separated"),
    num_questions: int = Form(10, ge=3, le=30),
    difficulty: str = Form("mixed"),
    sources_text: str = Form("", description="Optional pasted text"),
    files: Optional[List[UploadFile]] = File(default=None),
) -> QuizResponse:
    """Generate quiz from uploaded files and/or pasted text."""
    topic_list = [t.strip() for t in topics.replace(",", "\n").split("\n") if t.strip()]
    if not topic_list:
        raise HTTPException(status_code=400, detail="Add at least one topic.")

    sources: List[QuizSource] = []

    if sources_text.strip():
        sources.append(QuizSource(title="Pasted text", content=sources_text.strip()))

    for f in (files or []):
        if not f.filename:
            continue
        text = await extract_text_from_file(f)
        if text.strip():
            sources.append(QuizSource(title=f.filename, content=text))

    if not sources:
        raise HTTPException(
            status_code=400,
            detail="Provide source material: paste text and/or upload PDF/DOCX files.",
        )

    payload = QuizRequest(
        topics=topic_list,
        sources=sources,
        num_questions=num_questions,
        difficulty=difficulty,
    )
    return _call_llm(payload)
