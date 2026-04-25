from __future__ import annotations

from typing import Any, Dict

from iagencia.agents.orchestration.orchestrator import Orchestrator


def route_and_run(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aqui você futuramente roteia por:
    - job_type: brainstorm | research | create_copy | prompt_pack | etc
    Por enquanto, tudo vai para o mesmo grafo.
    """
    orchestrator = Orchestrator()
    return orchestrator.run(payload)
