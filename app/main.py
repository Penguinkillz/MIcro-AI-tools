from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.tools.quiz import router as quiz_router


app = FastAPI(title="Quiz Generator", version="0.1.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For MVP; tighten in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(quiz_router, prefix="/api")


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

