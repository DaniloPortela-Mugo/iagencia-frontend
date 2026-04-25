from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class CampaignState(Base):
    __tablename__ = "campaign_state"

    cliente_id = Column(String, primary_key=True)
    etapa_atual = Column(String, nullable=False, default="inicio")
    iteracoes = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class CampaignHistory(Base):
    __tablename__ = "campaign_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cliente_id = Column(String, index=True, nullable=False)
    etapa = Column(String, nullable=False)
    versao = Column(Integer, nullable=False)
    conteudo = Column(String, nullable=False)
    aprovado = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
