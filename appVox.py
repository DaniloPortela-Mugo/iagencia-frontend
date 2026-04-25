"""
appVox.py – back-end Flask refatorado (hot-fix 2.1)
---------------------------------------------------
• Corrige indentação quebrada em chat_api()
• Ajusta fallback de modelo dentro do próprio cfg
• Remove import OpenAI não utilizado
• Implementa CampaignDAO.advance() (antes faltava)
• Corrige variáveis indefinidas (state/current_state/nova_etapa)
• Persiste CampaignHistory com sessão DB corretamente
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from functools import wraps
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from werkzeug.utils import secure_filename

from chains import build_chain  # fábrica de chains (LangChain)
from VOX.models_db import Base, CampaignState, CampaignHistory


# ----------------------- Configuração básica ----------------------- #
load_dotenv()
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------- Banco de dados & DAO ---------------------------------- #
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///campanha.db")

engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("SQLALCHEMY_ECHO", "False").lower() == "true",
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

Base.metadata.create_all(engine)
Session: scoped_session = scoped_session(sessionmaker(bind=engine))


def with_session(func):
    """Decorator para injetar sessão SQLAlchemy e fechá-la corretamente."""

    @wraps(func)
    def _wrapper(*args, **kwargs):
        db = Session()
        try:
            return func(*args, db=db, **kwargs)
        finally:
            db.close()

    return _wrapper


class CampaignDAO:
    """Encapsula acesso a CampaignState."""

    @staticmethod
    @with_session
    def get_or_create(cliente_id: str, *, db) -> CampaignState:
        state: Optional[CampaignState] = db.get(CampaignState, cliente_id)
        if not state:
            state = CampaignState(cliente_id=cliente_id, etapa_atual="inicio", iteracoes=0)
            db.add(state)
            db.commit()
            db.refresh(state)
        return state

    @staticmethod
    @with_session
    def advance(cliente_id: str, nova_etapa: Optional[str] = None, *, db) -> CampaignState:
        """
        Incrementa iteracoes e, opcionalmente, muda etapa_atual.
        Se o estado não existir, cria.
        """
        state: Optional[CampaignState] = db.get(CampaignState, cliente_id)
        if not state:
            state = CampaignState(cliente_id=cliente_id, etapa_atual="inicio", iteracoes=0)
            db.add(state)
            db.commit()
            db.refresh(state)

        if nova_etapa:
            state.etapa_atual = nova_etapa

        state.iteracoes = (state.iteracoes or 0) + 1
        db.commit()
        db.refresh(state)
        return state


# -------------------------- Flask App ----------------------------- #
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET", "changeme")

app.config.update(
    UPLOAD_FOLDER=os.path.join(os.getcwd(), "uploads"),
    MAX_CONTENT_LENGTH=16 * 1024 * 1024,
)
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

ALLOWED_EXTENSIONS = {"txt", "pdf", "png", "jpg", "jpeg", "gif"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ----------- Carrega perfis de agente (uma vez) ------------------- #
AGENTS_FILE = os.path.join(os.path.dirname(__file__), "clientes_agentes.json")


def load_agents() -> Dict[str, Any]:
    if not os.path.exists(AGENTS_FILE):
        logger.error("Arquivo %s não encontrado!", AGENTS_FILE)
        return {}
    with open(AGENTS_FILE, encoding="utf-8") as f:
        return json.load(f)


agents: Dict[str, Any] = load_agents()


def require_login(view):
    @wraps(view)
    def _wrapper(*args, **kwargs):
        if "usuario" not in session:
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return _wrapper


# --------------------------- Autenticação ------------------------- #
@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        from auth import validar_usuario  # import local para evitar circular

        user = (request.form.get("login") or "").strip()
        pwd = request.form.get("senha")

        if validar_usuario(user, pwd):
            session["usuario"] = user
            logger.info("Usuário %s logado.", user)
            return redirect(url_for("clientes"))
        return render_template("login.html", erro="Login ou senha inválidos")

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ---------------------- Seleção de clientes ---------------------- #
@app.route("/clientes")
@require_login
def clientes():
    cards = [
        {
            "id": cid,
            "nome": cfg.get("nome", cid),
            "imagem_url": f"/static/imagens/{cid}.png",
            "chat_link": f"/chat/{cid}",
        }
        for cid, cfg in agents.items()
    ]
    return render_template("clientes.html", clientes=cards)


@app.route("/chat/<cliente_id>")
@require_login
def chat_view(cliente_id: str):
    if cliente_id not in agents:
        return redirect(url_for("clientes"))
    return render_template("chat.html", cliente_id=cliente_id)


# ------------------------------ Chat ----------------------------- #
@app.route("/api/chat", methods=["POST"])
@require_login
def chat_api():
    data: Dict[str, Any] = request.get_json(silent=True) or {}
    cid = (data.get("cliente_id") or "").strip()
    msg = (data.get("mensagem") or "").strip()

    if not cid or not msg:
        return jsonify({"erro": "cliente_id e mensagem são obrigatórios."}), 400

    cfg = agents.get(cid)
    if not cfg:
        return jsonify({"erro": "Cliente não encontrado"}), 404

    # garante state
    state = CampaignDAO.get_or_create(cid)

    # defaults dentro do cfg
    cfg.setdefault("temperature", 0.7)
    cfg.setdefault("modelo_padrao", "gpt-3.5-turbo")

    try:
        chain = build_chain(cfg, session["usuario"])
        resposta: str = chain.predict(input=msg)

        aprovado = msg.lower() == "aprovar"

        # etapa vigente para registrar no histórico desta resposta
        etapa_atual = state.etapa_atual

        # se aprovar, tenta avançar etapa via cfg["etapas"]
        if aprovado:
            etapas = cfg.get("etapas") or []
            nova_etapa: Optional[str] = None

            if isinstance(etapas, list) and etapas:
                try:
                    idx = etapas.index(etapa_atual)
                    if idx < len(etapas) - 1:
                        nova_etapa = etapas[idx + 1]
                except ValueError:
                    # se a etapa atual não estiver na lista, começa na primeira
                    nova_etapa = etapas[0]

            state = CampaignDAO.advance(cid, nova_etapa)
        else:
            # não aprovou: incrementa versão/iteração e mantém etapa
            state = CampaignDAO.advance(cid, None)

        # salva histórico de forma segura
        db = Session()
        try:
            hist = CampaignHistory(
                cliente_id=cid,
                etapa=etapa_atual,
                versao=state.iteracoes,
                conteudo=resposta,
                aprovado=aprovado,
            )
            db.add(hist)
            db.commit()
        finally:
            db.close()

    except Exception:
        logger.exception("Erro no LangChain")
        return jsonify({"erro": "Falha ao acessar o modelo"}), 500

    return jsonify(
        {
            "resposta": resposta,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


# ----------------------------- Upload ---------------------------- #
@app.route("/upload", methods=["POST"])
@require_login
def upload_file():
    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"erro": "Nenhum arquivo enviado"}), 400
    if not allowed_file(file.filename):
        return jsonify({"erro": "Tipo de arquivo não permitido"}), 400

    filename = secure_filename(file.filename)
    path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(path)

    return jsonify({"status": "ok", "path": path})


# ----------------------------- Run ------------------------------- #
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(debug=debug_mode, port=port)
