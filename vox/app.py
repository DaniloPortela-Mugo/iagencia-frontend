import json
import os
import sys

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    jsonify,
    Response,
    stream_with_context,
)
from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from typing import List, Dict, Any


# --- CONFIGURAÇÃO ---
load_dotenv()
base_dir = os.path.dirname(os.path.realpath(__file__))      # .../meu_app/vox
project_root = os.path.dirname(base_dir)                    # .../meu_app

app = Flask(
    __name__,
    template_folder=os.path.join(project_root, "templates"),
    static_folder=os.path.join(project_root, "static"),
)

app.secret_key = os.getenv("FLASK_SECRET_KEY") or os.urandom(24)

USERS = {"dan": "d", "bruno": "b", "julia": "j", "kleber": "k"}
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def load_client_data(filename: str = "clientes_agentes.json") -> dict:
    """
    Carrega o arquivo JSON com dados de clientes a partir da raiz do projeto.
    (raiz = pasta pai de 'vox/')
    """
    package_dir = os.path.dirname(os.path.realpath(__file__))          # .../meu_app/vox
    project_root = os.path.dirname(package_dir)                        # .../meu_app
    path = os.path.join(project_root, filename)

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            raise ValueError(
                f"'{filename}' deve conter um objeto JSON, não {type(data).__name__}."
            )
        return data
    except Exception as exc:
        app.logger.critical(f"Falha ao carregar dados de clientes: {exc}")
        sys.exit(f"Erro crítico: não foi possível carregar '{filename}': {exc}")


CLIENTES_DATA = load_client_data()


def get_langchain_llm(model_choice: str):
    """Retorna instância do LLM: 'gemini' ou 'gpt-4o' com capacidade de streaming."""
    if model_choice == 'gemini':
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY não configurada.")
        return ChatGoogleGenerativeAI(model="gemini-pro", google_api_key=GEMINI_API_KEY, streaming=True)
    if model_choice == 'gpt-4o':
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY não configurada.")
        return ChatOpenAI(model="gpt-4o", api_key=OPENAI_API_KEY, streaming=True)
    raise ValueError("Modelo inválido.")


def build_system_message(cliente_data: Dict[str, Any], agent_name: str) -> str:
    """
    Constrói uma mensagem de sistema abrangente usando os dados do cliente e do agente.
    Isso ajuda o LLM a ter um contexto mais rico sobre a marca e seu propósito.
    """
    system_parts = []

    # Prompt de sistema geral do cliente
    if cliente_data.get('system_prompt'):
        system_parts.append(cliente_data['system_prompt'])

    # Descrição do cliente
    if cliente_data.get('descricao'):
        system_parts.append(f"Descrição da empresa: {cliente_data['descricao']}")

    # Segmento
    if cliente_data.get('segmento'):
        system_parts.append(f"Segmento de mercado: {cliente_data['segmento']}")

    # Contexto específico do agente
    agent_context = cliente_data.get('agentes', {}).get(agent_name, {}).get('contexto', '')
    if agent_context:
        system_parts.append(f"[Contexto do Agente {agent_name}]: {agent_context}")

    # Persona
    persona = cliente_data.get('persona', {})
    if persona:
        persona_str = ', '.join([f"{k}: {v}" for k, v in persona.items() if v])
        system_parts.append(f"Persona do cliente: {persona_str}")

    # Público-alvo
    publico = cliente_data.get('publico', {})
    if publico:
        publico_str = ', '.join([f"{k}: {v}" for k, v in publico.items() if v])
        system_parts.append(f"Público-alvo: {publico_str}")

    # Voz da marca
    voz = cliente_data.get('voz', {})
    if voz:
        voz_str = ', '.join([f"{k}: {v}" for k, v in voz.items() if v])
        system_parts.append(f"Voz da marca: {voz_str}")

    # Palavras-chave e Hashtags
    if cliente_data.get('palavras_chave'):
        system_parts.append(f"Palavras-chave importantes: {', '.join(cliente_data['palavras_chave'])}")
    if cliente_data.get('palavras_proibidas'):
        system_parts.append(f"Palavras a serem evitadas: {', '.join(cliente_data['palavras_proibidas'])}")
    if cliente_data.get('hashtags_preferidas'):
        system_parts.append(f"Hashtags preferidas: {', '.join(cliente_data['hashtags_preferidas'])}")

    # Produtos (se existirem e forem relevantes)
    produtos = cliente_data.get('produtos')
    if produtos:
        produtos_list = []
        for prod in produtos:
            prod_info = f"{prod.get('nome', 'Produto Desconhecido')}: {prod.get('descricao', '')}"
            if prod.get('beneficios'):
                prod_info += f" (Benefícios: {', '.join(prod['beneficios'])})"
            produtos_list.append(prod_info)
        system_parts.append(f"Informações sobre produtos: {'; '.join(produtos_list)}")

    # Outras descrições de conteúdo
    if cliente_data.get('descricao_video'):
        system_parts.append(f"Diretrizes para vídeo: {cliente_data['descricao_video']}")
    if cliente_data.get('descricao_imagem'):
        system_parts.append(f"Diretrizes para imagem: {cliente_data['descricao_imagem']}")
    if cliente_data.get('descricao_texto'):
        system_parts.append(f"Diretrizes para texto: {cliente_data['descricao_texto']}")
    # Adicione mais conforme necessário para outros tipos de conteúdo

    return "\n\n".join(system_parts)


def get_ai_response_langchain_stream(model_choice: str, messages: List[Any]):
    """
    Envia mensagens ao LLM via LangChain e retorna um gerador para streaming da resposta.
    """
    try:
        llm = get_langchain_llm(model_choice)
        # O histórico de mensagens já inclui o SystemMessage e as mensagens anteriores
        for chunk in llm.stream(messages):
            if chunk.content:
                yield chunk.content
    except Exception as exc:
        app.logger.error(f"Erro ao chamar API de IA: {exc}")
        yield f"Erro ao gerar resposta: {exc}"


@app.route('/', methods=['GET', 'POST'])
def login() -> str:
    """Login do usuário."""
    if request.method == 'POST':
        u = request.form.get('login')
        p = request.form.get('senha')
        if USERS.get(u) == p:
            session['logged_in'] = True
            session['username'] = u
            return redirect(url_for('select_client'))
        return render_template('login.html', login="Login", erro="Usuário ou senha incorretos.")
    return render_template('login.html', login="Login")


@app.route('/clientes')
def select_client() -> str:
    """Exibe lista de clientes."""
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    clientes_list = []
    for cid, info in CLIENTES_DATA.items():
        nome = info.get('nome', cid)
        logo = info.get('logo_url')
        if logo and logo.startswith(('http://', 'https://')):
            img_url = logo
        else:
            local = f'imagens/{cid}.png'
            static_path = os.path.join(app.static_folder, local)
            if os.path.exists(static_path):
                img_url = url_for('static', filename=local)
            else:
                img_url = url_for('static', filename='imagens/vox.jpg')  # fallback

        clientes_list.append({
            'id': cid,
            'nome': nome,
            'imagem_url': img_url,
            'chat_link': url_for('chat_interface', cliente_id=cid),
        })

    return render_template('clientes.html', clientes=clientes_list)


@app.route('/chat/<cliente_id>')
def chat_interface(cliente_id: str) -> str:
    """Interface de chat para cliente específico."""
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    cliente = CLIENTES_DATA.get(cliente_id)
    if not cliente:
        return "Cliente não encontrado.", 404

    agentes = cliente.get('agentes', {})
    ai_models = []
    if GEMINI_API_KEY:
        ai_models.append({'id': 'gemini', 'name': 'Gemini'})
    if OPENAI_API_KEY:
        ai_models.append({'id': 'gpt-4o', 'name': 'GPT-4o'})

    # Inicializa o histórico de chat para o cliente e agente selecionados
    # Usa uma chave composta para isolar o histórico por cliente/agente
    chat_key = f"{cliente_id}_history"
    if chat_key not in session:
        session[chat_key] = {} # Dicionário para armazenar histórico por nome de agente
    
    app.logger.debug(f"Chat interface loaded for client: {cliente_id}. Initial session state for chat_key '{chat_key}': {session.get(chat_key)}")

    return render_template('chat.html', cliente_id=cliente_id, agentes=agentes, ai_models=ai_models)

@app.route('/api/history/<cliente_id>/<agent_name>', methods=['GET'])
def api_history(cliente_id: str, agent_name: str):
    """Retorna o histórico de chat para um cliente e agente específicos."""
    if not session.get('logged_in'):
        return jsonify(error="Não autenticado"), 401

    chat_key = f"{cliente_id}_history"
    # Adicionando log para verificar o estado da sessão antes de tentar acessar
    app.logger.debug(f"Request for history: chat_key='{chat_key}', agent_name='{agent_name}'")
    app.logger.debug(f"Current session content for chat_key: {session.get(chat_key)}")

    agent_history = session.get(chat_key, {}).get(agent_name, [])

    # Adicionando log para verificar o histórico antes de enviar
    app.logger.debug(f"Retrieving history for client: {cliente_id}, agent: {agent_name}. History length: {len(agent_history)}")
    
    # Formata o histórico para o frontend
    formatted_history = []
    for msg in agent_history:
        # Apenas mensagens HumanMessage e AIMessage devem ser enviadas, SystemMessage é para o LLM
        if isinstance(msg, HumanMessage):
            formatted_history.append({'sender': 'user', 'content': msg.content})
        elif isinstance(msg, AIMessage):
            formatted_history.append({'sender': 'ai', 'content': msg.content})
    
    app.logger.debug(f"Formatted history being sent: {formatted_history}")
    
    return jsonify(history=formatted_history)


@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Recebe mensagem e retorna resposta formatada via streaming."""
    if not session.get('logged_in'):
        return jsonify(error="Não autenticado"), 401

    data = request.get_json() or {}
    cid = data.get('cliente_id')
    agent = data.get('agent_name')
    model = data.get('ai_model')
    user_msg_content = data.get('message')

    if not all([cid, agent, model, user_msg_content]):
        return jsonify(error="Parâmetros incompletos."), 400

    cliente = CLIENTES_DATA.get(cid)
    if not cliente:
        return jsonify(error="Cliente não encontrado."), 404

    # Prepara o histórico de chat
    chat_key = f"{cid}_history"
    if chat_key not in session:
        session[chat_key] = {}
    
    agent_history = session[chat_key].get(agent, [])

    # Log para verificar o histórico antes da chamada do LLM
    app.logger.debug(f"Chat before LLM call for client {cid}, agent {agent}: {agent_history}")

    # Constrói a mensagem de sistema aprimorada
    system_msg_content = build_system_message(cliente, agent)
    
    # Adiciona a mensagem de sistema e as mensagens do histórico ao contexto do LLM
    # O SystemMessage deve vir primeiro
    messages = [SystemMessage(content=system_msg_content)] + agent_history + [HumanMessage(content=user_msg_content)]

    def generate_stream():
        full_response_content = ""
        try:
            for chunk in get_ai_response_langchain_stream(model, messages):
                full_response_content += chunk
                # Envia cada chunk como um evento SSE
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            # Após a conclusão, atualiza o histórico na sessão
            # Adiciona a mensagem do usuário e a resposta completa da IA ao histórico
            agent_history.append(HumanMessage(content=user_msg_content))
            agent_history.append(AIMessage(content=full_response_content))
            session[chat_key][agent] = agent_history
            session.modified = True # Marca a sessão como modificada para que o Flask salve as alterações
            
            app.logger.debug(f"Chat after LLM call and session update for client {cid}, agent {agent}: {session[chat_key][agent]}")
            
            # Envia um evento de 'fim' para o frontend saber que a resposta terminou
            yield f"data: {json.dumps({'end': True})}\n\n"
        except Exception as e:
            app.logger.error(f"Error during streaming response for client {cid}, agent {agent}: {e}")
            yield f"data: {json.dumps({'error': str(e), 'end': True})}\n\n"


    # Retorna o Response como um stream de eventos
    return Response(stream_with_context(generate_stream()), mimetype='text/event-stream')


@app.route('/logout')
def logout() -> str:
    session.clear()
    return redirect(url_for('login'))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=True)

