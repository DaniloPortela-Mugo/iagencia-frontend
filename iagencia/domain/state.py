from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from iagencia.domain.types import Mode, RunStatus, Segment
from iagencia.services.time_ import now_iso


@dataclass
class StepRecord:
    step_name: str
    status: str  # "started" | "finished" | "failed"
    started_at_iso: str
    finished_at_iso: Optional[str] = None
    error: Optional[str] = None


@dataclass
class NextAction:
    type: str
    title: str
    description: str
    payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RunState:
    # identidade (mínimo)
    run_id: str
    org_id: str
    user_id: str
    client_id: str

    # contexto
    segment: Segment = Segment.AGENCIA
    mode: Mode = Mode.SOCIAL
    locale: str = "pt-BR"

    # status
    status: RunStatus = RunStatus.QUEUED
    current_step: str = "init"
    step_history: List[StepRecord] = field(default_factory=list)
    next_actions: List[NextAction] = field(default_factory=list)

    # inputs
    brief: Dict[str, Any] = field(default_factory=dict)
    user_inputs: Dict[str, Any] = field(default_factory=dict)

    # outputs (no MVP, só placeholders; depois você pluga artefatos/assets)
    artifacts: List[Dict[str, Any]] = field(default_factory=list)

    # erros / metas
    errors: List[str] = field(default_factory=list)

    # timestamps
    created_at_iso: str = field(default_factory=now_iso)
    updated_at_iso: str = field(default_factory=now_iso)


def mark_step_started(state: RunState, step_name: str) -> None:
    state.current_step = step_name
    state.step_history.append(
        StepRecord(step_name=step_name, status="started", started_at_iso=now_iso())
    )
    state.updated_at_iso = now_iso()


def mark_step_finished(state: RunState, step_name: str) -> None:
    for rec in reversed(state.step_history):
        if rec.step_name == step_name and rec.status == "started":
            rec.status = "finished"
            rec.finished_at_iso = now_iso()
            break
    state.updated_at_iso = now_iso()


def mark_step_failed(state: RunState, step_name: str, error: str) -> None:
    for rec in reversed(state.step_history):
        if rec.step_name == step_name and rec.status == "started":
            rec.status = "failed"
            rec.finished_at_iso = now_iso()
            rec.error = error
            break
    state.errors.append(error)
    state.updated_at_iso = now_iso()
