from __future__ import annotations

from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Se você usa OpenAI via LangChain novo:
# pip install langchain-openai
from langchain_openai import ChatOpenAI


def build_chain(cfg: Dict[str, Any], usuario: str):
    """
    Retorna um objeto com método .predict(input=...)
    para manter compatibilidade com seu appVox.py.

    Observação: aqui NÃO usamos ConversationBufferMemory.
    Se quiser histórico, passe/recupere mensagens e injete em "history".
    """

    modelo = cfg.get("modelo_padrao", "gpt-3.5-turbo")
    temperature = float(cfg.get("temperature", 0.7))

    system_text = cfg.get(
        "system",
        f"Você é um assistente da Vox. Usuário logado: {usuario}. Responda em pt-BR.",
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            SystemMessage(content=system_text),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ]
    )

    llm = ChatOpenAI(model=modelo, temperature=temperature)

    chain = prompt | llm

    class _Compat:
        """Adapter para manter chain.predict(input=...) no seu Flask."""

        def __init__(self):
            self.history: List[BaseMessage] = []

        def predict(self, input: str) -> str:
            # Se você quiser histórico por usuário/cliente, carregue do DB e preencha self.history
            result = chain.invoke({"input": input, "history": self.history})
            # result é um AIMessage
            self.history.append(HumanMessage(content=input))
            self.history.append(AIMessage(content=result.content))
            return result.content

    return _Compat()
