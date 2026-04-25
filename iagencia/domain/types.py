from __future__ import annotations

from enum import Enum


class RunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_INPUT = "waiting_input"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class Segment(str, Enum):
    PUBLICIDADE = "publicidade"
    DIGITAL_SOCIAL = "digital_social"
    INHOUSE = "inhouse"
    AGENCIA = "agencia"


class Mode(str, Enum):
    DA_PRO = "da_pro"
    SOCIAL = "social"
