# imports
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, TypedDict
from langgraph.graph import StateGraph, END

from iagencia.agents.brainstorm.brainstorm_agent import run_brainstorm
from iagencia.agents.copy.copy_agent import run_copy_pack



class RunState(TypedDict, total=False):
    run_id: str
    status: str
    current_step: str
    created_at_iso: str
    updated_at_iso: str

    # inputs
    brief: Dict[str, Any]
    user_inputs: Dict[str, Any]

    # outputs
    artifacts: list[Dict[str, Any]]
    errors: list[str]

    # internal
    brainstorm: Dict[str, Any]
    research: Dict[str, Any]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _init_state(state: RunState) -> RunState:
    state.setdefault("status", "running")
    state.setdefault("current_step", "init")
    state.setdefault("created_at_iso", _now_iso())
    state["updated_at_iso"] = _now_iso()

    state.setdefault("brief", {})
    state.setdefault("user_inputs", {})
    state.setdefault("artifacts", [])
    state.setdefault("errors", [])

    state.setdefault("brainstorm", {})
    state.setdefault("research", {})
    return state


def _brainstorm_creative(state: RunState) -> RunState:
    state["current_step"] = "brainstorm_creative"
    state["updated_at_iso"] = _now_iso()

    try:
        out = run_brainstorm(
            brief=state.get("brief", {}),
            user_inputs=state.get("user_inputs", {}),
        )
        state["brainstorm"] = out

        artifact = {
            "type": "brainstorm_pack",
            "title": "Brainstorm Criativo (Modo Redator)",
            "content": out,
            "created_at_iso": _now_iso(),
            "created_by": "brainstorm_creative",
            "version": 1,
            "tags": ["brainstorm", "redator"],
        }
        state["artifacts"].append(artifact)

    except Exception as e:
        msg = f"brainstorm_creative: {e}"
        state["errors"].append(msg)

        # Fallback: mantém o contrato da UI
        state["artifacts"].append(
            {
                "type": "error_report",
                "title": "Erro no Brainstorm",
                "content": {"message": msg},
                "created_at_iso": _now_iso(),
                "created_by": "brainstorm_creative",
                "version": 1,
                "tags": ["error"],
            }
        )
        state["brainstorm"] = {
            "ideas": [],
            "notes": "Fallback gerado por erro no brainstorm.",
        }

    return state



def _research_placeholder(state: RunState) -> RunState:
    """
    Placeholder do agente de pesquisa.
    Vamos plugar concorrentes/tendências depois (fontes, termos e recorte).
    """
    state["current_step"] = "research"
    state["updated_at_iso"] = _now_iso()

    state["research"] = {
        "status": "placeholder",
        "notes": "Pesquisa ainda não conectada. Próximo passo: definir fontes/queries/segmento/região.",
    }
    return state


def _draft_copy_llm(state: RunState) -> RunState:
    state["current_step"] = "draft_copy"
    state["updated_at_iso"] = _now_iso()

    try:
        out = run_copy_pack(
            brief=state.get("brief", {}),
            user_inputs=state.get("user_inputs", {}),
            brainstorm=state.get("brainstorm") or {},
        )

        artifact = {
            "type": "copy_pack",
            "title": "Copy Pack (LLM)",
            "content": {
                "headlines": out.get("headlines", []),
                "primary_texts": out.get("primary_texts", []),
                "ctas": out.get("ctas", []),
                "variations_notes": out.get("variations_notes", ""),
                "meta": out.get("meta", {}),
            },
            "created_at_iso": _now_iso(),
            "created_by": "draft_copy_llm",
            "version": 1,
            "tags": ["v1", "llm"],
        }
        state["artifacts"].append(artifact)

    except Exception as e:
        msg = f"draft_copy: {e}"
        state["errors"].append(msg)

        # Fallback: mantém o contrato da UI
        state["artifacts"].append(
            {
                "type": "error_report",
                "title": "Erro no Copy Pack",
                "content": {"message": msg},
                "created_at_iso": _now_iso(),
                "created_by": "draft_copy_llm",
                "version": 1,
                "tags": ["error"],
            }
        ),

def _finalize(state: RunState) -> RunState:
    state["current_step"] = "finalize"
    state["updated_at_iso"] = _now_iso()

        # E ainda devolve um copy_pack “vazio” pra UI não quebrar
    state["artifacts"].append(
            {
                "type": "copy_pack",
                "title": "Copy Pack (fallback)",
                "content": {
                    "headlines": [],
                    "primary_texts": [],
                    "ctas": [],
                    "variations_notes": "Fallback gerado por erro no copy.",
                    "meta": {},
                },
                "created_at_iso": _now_iso(),
                "created_by": "draft_copy_llm",
                "version": 1,
                "tags": ["fallback", "error"],
            }
        )

    return state


def build_graph():
    graph = StateGraph(RunState)

    graph.add_node("init", _init_state)
    graph.add_node("brainstorm_creative", _brainstorm_creative)
    graph.add_node("research", _research_placeholder)
    graph.add_node("draft_copy", _draft_copy_llm)
    graph.add_node("finalize", _finalize)

    graph.set_entry_point("init")
    graph.add_edge("init", "brainstorm_creative")
    graph.add_edge("brainstorm_creative", "research")
    graph.add_edge("research", "draft_copy")
    graph.add_edge("draft_copy", "finalize")
    graph.add_edge("finalize", END)

    return graph.compile()

