from __future__ import annotations

from typing import Any, Dict, Optional

from iagencia.graphs.main_graph import build_graph


class Orchestrator:
    def __init__(self) -> None:
        self._graph = build_graph()

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execução síncrona (bom pra começar).
        Depois a gente evolui para streaming de eventos (SSE/WebSocket)
        pro React acompanhar passo a passo.
        """
        return self._graph.invoke(state)

    async def run_async(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execução assíncrona (bom pra escalar).
        Depois a gente evolui para streaming de eventos (SSE/WebSocket)
        pro React acompanhar passo a passo.
        """
        return await self._graph.invoke_async(state)