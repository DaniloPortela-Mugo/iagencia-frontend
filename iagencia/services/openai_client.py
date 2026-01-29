from __future__ import annotations

import os
from typing import Optional

from openai import OpenAI


_client: Optional[OpenAI] = None


def get_openai_client() -> OpenAI:
    """
    Cliente singleton do OpenAI.
    Usa OPENAI_API_KEY do ambiente.
    """
    global _client

    if _client is not None:
        return _client

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY não encontrado. Defina no seu .env ou exporte no shell."
        )

    _client = OpenAI(api_key=api_key)
    return _client
