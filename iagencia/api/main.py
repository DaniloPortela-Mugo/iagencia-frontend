from __future__ import annotations

from fastapi import FastAPI, HTTPException

from iagencia.api.schemas import RunCreateRequest, RunResponse
from iagencia.api.store import InMemoryRunStore
from iagencia.services.id import new_id
from iagencia.agents.orchestration.router import route_and_run
import os
from openai import OpenAI

app = FastAPI(title="IAgência API", version="0.1.0")
store = InMemoryRunStore()

def get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY não encontrado. Defina no seu .env ou exporte no shell.")
    return OpenAI(api_key=api_key)
client = get_client()

@app.get("/")
def root() -> dict:
    return {
        "name": "IAgência API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
        "create_run": "POST /runs",
        "get_run": "GET /runs/{run_id}",
    }

@app.get("/health")
def health() -> dict:
    return {"ok": True}

@app.post("/runs", response_model=RunResponse)
def create_run(req: RunCreateRequest) -> RunResponse:
    run_id = new_id("run")

    payload = {
        "run_id": run_id,
        "brief": req.brief,
        "user_inputs": req.user_inputs,
    }

    result = route_and_run(payload)
    store.put(run_id, result)

    return RunResponse(
        run_id=run_id,
        status=result.get("status", "unknown"),
        current_step=result.get("current_step", ""),
        created_at_iso=result.get("created_at_iso", ""),
        updated_at_iso=result.get("updated_at_iso", ""),
        artifacts=result.get("artifacts", []),
        errors=result.get("errors", []),
    )


@app.get("/runs/{run_id}", response_model=RunResponse)
def get_run(run_id: str) -> RunResponse:
    result = store.get(run_id)
    if not result:
        raise HTTPException(status_code=404, detail="Run not found")

    return RunResponse(
        run_id=run_id,
        status=result.get("status", "unknown"),
        current_step=result.get("current_step", ""),
        created_at_iso=result.get("created_at_iso", ""),
        updated_at_iso=result.get("updated_at_iso", ""),
        artifacts=result.get("artifacts", []),
        errors=result.get("errors", []),
    )
