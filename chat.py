import json
from openai import OpenAI
from dotenv import load_dotenv
import os
import logging

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_ITERACOES = 3

def executar_fluxo_de_criacao(cliente_id, briefing, etapa_id=None):
    base_dir = os.path.dirname(__file__)
    caminhos = {
        "clientes_agentes": os.path.join(base_dir, "clientes_agentes.json"),
        "fluxo_criacao": os.path.join(base_dir, "fluxo_criacao_etapas.json"),
        "clientes_identidade": os.path.join(base_dir, "clientes_identidade.json")
    }

    if not os.path.exists(caminhos["clientes_agentes"]):
        logger.error("clientes_agentes.json não encontrado.")
        return {"erro": "[Erro] Arquivo clientes_agentes.json não encontrado."}

    with open(caminhos["clientes_agentes"], "r", encoding="utf-8") as f:
        dados = json.load(f)

    cliente = dados.get(cliente_id)
    if not cliente:
        logger.error(f"Cliente '{cliente_id}' não encontrado.")
        return {"erro": f"Cliente '{cliente_id}' não encontrado."}

    agentes = {agente["id"]: agente for agente in cliente["agentes"]}
    if not etapa_id:
        logger.error("Etapa não informada.")
        return {"erro": "Etapa não informada."}

    with open(caminhos["fluxo_criacao"], "r", encoding="utf-8") as f:
        fluxo = json.load(f)

    etapa_info = fluxo.get(etapa_id)
    if not etapa_info:
        logger.error(f"Etapa '{etapa_id}' não encontrada.")
        return {"erro": f"Etapa '{etapa_id}' não encontrada."}

    agente_id = etapa_info.get("agente")
    if not agente_id:
        logger.error(f"A etapa '{etapa_id}' não tem agente definido.")
        return {"erro": f"A etapa '{etapa_id}' não tem agente definido."}

    agente = agentes.get(agente_id)
    if not agente:
        logger.error(f"Agente '{agente_id}' não encontrado no cliente '{cliente_id}'.")
        return {"erro": f"Agente '{agente_id}' não encontrado no cliente '{cliente_id}'."}

    contexto_extra = ""
    if agente_id == "imagens" and os.path.exists(caminhos["clientes_identidade"]):
        with open(caminhos["clientes_identidade"], "r", encoding="utf-8") as f:
            identidade = json.load(f).get(cliente_id)
            if identidade:
                contexto_extra = f"\n\n[Identidade Visual do Cliente]:\n{json.dumps(identidade, indent=2)}"

    mensagens = [
        {"role": "system", "content": agente["contexto"]},
        {"role": "user", "content": briefing + contexto_extra}
    ]

    try:
        resposta = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=mensagens
        )
        resposta_texto = resposta.choices[0].message.content
        logger.info(f"Etapa {etapa_id} executada com sucesso para o cliente {cliente_id}.")
        return resposta_texto
    except Exception as e:
        logger.exception("[Erro OpenAI]")
        return {"erro": f"[Erro interno: {str(e)}]"}

def verificar_etapa_condicional(cliente_id, mensagem_usuario):
    resposta = mensagem_usuario.lower().strip()
    if resposta in ["aprovar", "revisar"]:
        logger.info(f"Decisão condicional '{resposta}' recebida para o cliente {cliente_id}.")
        return resposta
    else:
        return None

def enviar_mensagem(cliente_id, mensagem_usuario, etapa_atual):
    # Verifica se a mensagem representa um comando condicional ("aprovar" ou "revisar")
    etapa_esperada = verificar_etapa_condicional(cliente_id, mensagem_usuario)

    if etapa_esperada is not None:
        if etapa_esperada == "aprovar":
            logger.info(f"Etapa aprovada para o cliente {cliente_id}. Avançando para a próxima etapa.")
            # Aqui, você pode chamar uma função para atualizar o estado, se necessário.
            return "Aprovado, avançando para a próxima etapa!"
        elif etapa_esperada == "revisar":
            logger.info(f"Etapa revisada para o cliente {cliente_id}. Solicitando detalhes para alteração.")
            # Se a revisão não implica transição, retorna essa mensagem.
            return "Revisando etapa... Por favor, forneça detalhes para alteração."

    # Se não for um comando condicional, processa o fluxo normalmente.
    logger.info(f"Processando fluxo normal para o cliente {cliente_id} na etapa {etapa_atual}.")
    return executar_fluxo_de_criacao(cliente_id, mensagem_usuario, etapa_atual)
