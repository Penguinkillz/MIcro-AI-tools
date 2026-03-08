# AI Quiz Generator

Turn your notes, PDFs, and DOCX files into ready-to-use multiple-choice quizzes. Pick topics, upload or paste source material, choose difficulty and question count — get a quiz with explanations.

## Features

- **Input:** Topics (one per line or comma-separated) + source material
- **Sources:** Upload PDF/DOCX and/or paste text; you can combine both
- **Controls:** Number of questions (3–30), difficulty (easy / medium / hard / mixed)
- **Output:** Multiple-choice questions with one correct answer and a short explanation per question
- **UI:** Dark theme, two-pane layout (inputs left, generated quiz right)

No accounts, no storage — runs on your machine or your deployment.

## Local setup

### Prerequisites

- Python 3.10+
- A [Groq API key](https://console.groq.com/) (free tier is enough)

### Steps

```bash
git clone https://github.com/Penguinkillz/Micro-AI-tools.git
cd Micro-AI-tools

python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the project root (copy from `.env.example`):

```
PLATFORM_GROQ_API_KEY=your_groq_key_here
```

Run the server:

```bash
uvicorn main:app --reload --port 8000
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Project structure

```
├── main.py                     # FastAPI app, quiz router + frontend mount
├── core/
│   ├── config.py               # PLATFORM_* env vars
│   ├── llm.py                  # Groq/OpenAI client, key rotation
│   └── file_extract.py         # PDF/DOCX text extraction
├── tools/
│   └── quiz_generator/
│       ├── models.py           # QuizRequest, QuizResponse, etc.
│       ├── service.py          # Quiz generation logic
│       ├── router.py           # /api/quiz/generate, /api/quiz/generate-from-files
│       └── frontend/
│           ├── index.html
│           └── main.js
├── requirements.txt
├── Procfile                    # Railway: web = uvicorn main:app ...
└── .env.example
```

## Environment variables

| Variable | Required | Description |
|---------|----------|-------------|
| `PLATFORM_GROQ_API_KEY` | Yes | Groq API key (primary LLM) |
| `PLATFORM_GROQ_API_KEY_2` | No | Second key for rotation |
| `PLATFORM_GROQ_API_KEY_3` | No | Third key for rotation |
| `PLATFORM_OPENAI_API_KEY` | No | OpenAI fallback if no Groq keys |

## Tech stack

- **Backend:** Python, FastAPI
- **LLM:** Groq (Llama 3.3 70B) with optional OpenAI fallback
- **File parsing:** pypdf, python-docx
- **Frontend:** HTML, CSS, JS (no build step)
- **Deploy:** Railway (Procfile included), Umami for analytics
