from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


def load_env() -> None:
    project_root = Path(__file__).resolve().parents[1]  # .../meu_app
    load_dotenv(project_root / ".env")


load_env()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError(
        "OPENAI_API_KEY não encontrado. Defina no seu .env ou exporte no shell."
    )
