from __future__ import annotations

from typing import Any, Dict, Optional


class InMemoryRunStore:
    def __init__(self) -> None:
        self._runs: Dict[str, Dict[str, Any]] = {}

    def put(self, run_id: str, state: Dict[str, Any]) -> None:
        self._runs[run_id] = state

    def get(self, run_id: str) -> Optional[Dict[str, Any]]:
        return self._runs.get(run_id)

run_store = InMemoryRunStore()