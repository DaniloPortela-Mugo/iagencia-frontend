from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, TypedDict


# -----------------------------
# IDs / Tipos básicos
# -----------------------------
RunId = str
UserId = str
OrgId = str
ClientId = str
ProjectId = str
TaskId = str
ArtifactId = str
AssetId = str


class RunStatus(str, Enum):
    QUEUED = "Na fila"
    RUNNING = "Rodando"
    WAITING_INPUT = "Aguardando entrada"
    SUCCEEDED = "Sucesso"
    FAILED = "Falhou"
    CANCELED = "Cancelado"


class Segment(str, Enum):
    PUBLICIDADE = "publicidade"
    DIGITAL_SOCIAL = "digital_social"
    INHOUSE = "inhouse"
    AGENCIA = "agencia"


class Mode(str, Enum):
    DA_PRO = "da_pro"
    SOCIAL = "social"


class MediaType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"


# -----------------------------
# Requisitos / Brief
# -----------------------------
class Brief(TypedDict, total=False):
    objective: str  # objetivo da peça/campanha
    audience: str
    product_or_offer: str
    message: str
    tone: str
    mandatory_elements: List[str]   # textos/selos/claims obrigatórios
    restrictions: List[str]         # proibições / compliance
    format: str                     # 1:1, 9:16, 16:9 etc
    channels: List[str]             # instagram, youtube, display...
    language: str                   # "pt-BR"
    deadline_iso: str               # opcional
    extra: Dict[str, Any]


# -----------------------------
# Pesquisa (fontes + evidências)
# -----------------------------
class Source(TypedDict, total=False):
    title: str
    url: str
    snippet: str
    publisher: str
    published_at_iso: str
    accessed_at_iso: str


class ResearchBundle(TypedDict, total=False):
    query: str
    sources: List[Source]
    notes: str
    claims: List[str]               # fatos/claims extraídos
    risks: List[str]                # riscos de alucinação / falta de fonte


# -----------------------------
# Artefatos (saídas textuais estruturadas)
# -----------------------------
class ArtifactType(str, Enum):
    CONCEPT_SET = "concept_set"
    COPY_PACK = "copy_pack"
    SCRIPT = "script"
    PROMPT_PACK = "prompt_pack"
    QA_REPORT = "qa_report"
    PLAN = "plan"


class Artifact(TypedDict, total=False):
    artifact_id: ArtifactId
    type: ArtifactType
    title: str
    content: Dict[str, Any]         # payload estruturado (ver exemplos abaixo)
    created_at_iso: str
    created_by: str                 # nome do nó/agente ("copywriter", "qa", etc)
    version: int
    tags: List[str]


# -----------------------------
# Assets (imagem/vídeo + metadados)
# -----------------------------
class AssetStatus(str, Enum):
    QUEUED = "Na fila"
    GENERATING = "gerando"
    READY = "pronto"
    FAILED = "falhou"


class Asset(TypedDict, total=False):
    asset_id: AssetId
    media_type: MediaType           # image/video
    status: AssetStatus
    provider: str                   # "midjourney", "runway", "kling", etc
    prompt: str                     # prompt usado
    negative_prompt: str
    params: Dict[str, Any]          # seed, steps, sampler, cfg, aspect_ratio...
    reference_urls: List[str]       # refs usadas (S3/R2/URL)
    output_urls: List[str]          # outputs (S3/R2/URL)
    preview_url: str
    created_at_iso: str
    error: str


# -----------------------------
# Aprovação / feedback
# -----------------------------
class ApprovalStatus(str, Enum):
    PENDING = "Pendente"
    APPROVED = "Aprovado"
    CHANGES_REQUESTED = "Alterações solicitadas"


class Approval(TypedDict, total=False):
    approval_id: str
    artifact_id: ArtifactId
    status: ApprovalStatus
    reviewer: str
    comments: str
    created_at_iso: str


class Feedback(TypedDict, total=False):
    kind: Literal["copy", "visual", "video", "strategy", "compliance", "general"]
    message: str
    constraints: List[str]          # ex: "não usar vermelho", "mudar CTA", etc
    created_at_iso: str
    author: str


# -----------------------------
# Custos / métricas
# -----------------------------
class CostLine(TypedDict, total=False):
    provider: str                   # openai, runway etc
    model: str
    input_tokens: int
    output_tokens: int
    unit_cost_brl: float
    total_cost_brl: float
    created_at_iso: str


class Telemetry(TypedDict, total=False):
    latency_ms: int
    retries: int
    warnings: List[str]


# -----------------------------
# “Memória” / contexto longo (controlado)
# -----------------------------
class Memory(TypedDict, total=False):
    brand_voice: str
    product_facts: List[str]
    banned_claims: List[str]
    style_presets: Dict[str, Any]   # presets do DA PRO / Social
    glossary: Dict[str, str]
    extra: Dict[str, Any]


# -----------------------------
# Controle do fluxo (routing / tarefas)
# -----------------------------
class NextAction(TypedDict, total=False):
    # ação sugerida ao usuário ou ao sistema
    type: Literal[
        "request_input",
        "generate_variations",
        "revise_with_feedback",
        "produce_assets",
        "approve",
        "stop"
    ]
    title: str
    description: str
    payload: Dict[str, Any]


class StepRecord(TypedDict, total=False):
    step_name: str                  # nome do nó no LangGraph
    started_at_iso: str
    finished_at_iso: str
    status: Literal["started", "finished", "failed"]
    error: str
    notes: str


# -----------------------------
# RunState (o estado do LangGraph)
# -----------------------------
class RunState(TypedDict, total=False):
    # identidade
    run_id: RunId
    org_id: OrgId
    user_id: UserId
    client_id: ClientId
    project_id: ProjectId

    # contexto do produto
    segment: Segment                # publicidade / social / etc
    mode: Mode                      # da_pro / social (pode derivar do segment)
    locale: str                     # "pt-BR"
    created_at_iso: str
    updated_at_iso: str

    # status / controle
    status: RunStatus
    current_step: str
    step_history: List[StepRecord]
    next_actions: List[NextAction]

    # entradas
    brief: Brief
    user_inputs: Dict[str, Any]     # respostas do usuário (campos soltos)
    feedback: List[Feedback]

    # pesquisa
    research: List[ResearchBundle]

    # saídas
    artifacts: List[Artifact]
    assets: List[Asset]
    approvals: List[Approval]

    # memória/brand kit
    memory: Memory

    # observabilidade / custo
    costs: List[CostLine]
    telemetry: Telemetry

    # erros
    errors: List[str]


# -----------------------------
# Exemplos de "content" de artefatos
# -----------------------------
# 1) CONCEPT_SET.content
# {
#   "concepts": [
#     {"id": "C1", "name": "Ideia 1", "insight": "...", "angle": "..."},
#     {"id": "C2", "name": "Ideia 2", "insight": "...", "angle": "..."},
#   ],
#   "recommended": "C2"
# }
#
# 2) COPY_PACK.content
# {
#   "headlines": ["...", "..."],
#   "primary_texts": ["...", "..."],
#   "ctas": ["Compre agora", "Saiba mais"],
#   "variations": [{"id": "V1", "headline": "...", "body": "..."}]
# }
#
# 3) PROMPT_PACK.content
# {
#   "visual_prompt": "...",
#   "negative_prompt": "...",
#   "camera": {"lens": "...", "angle": "...", "lighting": "..."},
#   "params": {"aspect_ratio": "1:1", "sampler": "DPM++ 2M Karras"}
# }
#
# 4) QA_REPORT.content
# {
#   "checks": [
#     {"name": "compliance", "status": "ok", "notes": "..."},
#     {"name": "brand_voice", "status": "warn", "notes": "..."},
#   ],
#   "fixes": ["Trocar claim X", "Ajustar CTA"]
# }
