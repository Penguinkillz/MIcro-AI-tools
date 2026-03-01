# Quiz Generator

Turn your notes into ready-to-use quizzes. Upload PDF/DOCX or paste text, add topics, and generate multiple-choice quizzes with AI.

## Features

- **File upload** — PDF and DOCX support
- **Paste text** — Or paste notes directly
- **Quiz mode** — Answer questions, then submit to see answers and explanations
- **Groq / OpenAI** — Uses Groq (free tier) by default; falls back to OpenAI if configured

## Quick start

### 1. Clone and setup

```bash
git clone https://github.com/YOUR_USERNAME/quiz-generator.git
cd quiz-generator
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
```

### 2. Add API key

Create a `.env` file in the project root:

```
QUIZ_GROQ_API_KEY=gsk_your_groq_key_here
```

Get a free key at [console.groq.com](https://console.groq.com/).

### 3. Run

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Project structure

```
quiz_generator/
├── app/
│   ├── main.py          # FastAPI app
│   ├── config.py        # Settings (env vars)
│   ├── models/          # Pydantic models
│   ├── tools/           # Tool modules (quiz, etc.)
│   └── utils/           # Helpers (file extraction)
├── frontend/            # Static HTML/CSS/JS
├── requirements.txt
└── README.md
```

## Tech stack

- **Backend:** Python, FastAPI
- **AI:** Groq (Llama) / OpenAI
- **Files:** pypdf, python-docx
