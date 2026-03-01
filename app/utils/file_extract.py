"""Extract plain text from PDF and DOCX files."""
from io import BytesIO

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader


def extract_pdf(content: bytes) -> str:
    """Extract text from a PDF file."""
    try:
        reader = PdfReader(BytesIO(content))
        parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
        return "\n\n".join(parts) if parts else ""
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}") from e


def extract_docx(content: bytes) -> str:
    """Extract text from a DOCX file."""
    try:
        from docx import Document

        doc = Document(BytesIO(content))
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read DOCX: {e}") from e


ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE_MB = 10


async def extract_text_from_file(file: UploadFile) -> str:
    """Read file content and extract text based on extension."""
    name = (file.filename or "").lower()
    if not any(name.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Use PDF or DOCX.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB.",
        )

    if name.endswith(".pdf"):
        return extract_pdf(content)
    if name.endswith(".docx"):
        return extract_docx(content)

    raise HTTPException(status_code=400, detail="Unsupported file type.")
