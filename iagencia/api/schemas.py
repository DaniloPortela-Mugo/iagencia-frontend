from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RunCreateRequest(BaseModel):
    brief: Dict[str, Any] = Field(default_factory=dict)
    user_inputs: Dict[str, Any] = Field(default_factory=dict)


class RunResponse(BaseModel):
    run_id: str
    status: str
    current_step: str
    created_at_iso: str
    updated_at_iso: str
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
