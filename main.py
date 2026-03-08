"""
Quiz Generator — standalone entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from tools.quiz_generator.router import router as quiz_router

app = FastAPI(title="AI Quiz Generator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quiz_router, prefix="/api")
app.mount("/", StaticFiles(directory="tools/quiz_generator/frontend", html=True), name="frontend")
