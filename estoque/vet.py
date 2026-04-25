import tkinter as tk
import pandas as pd
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
from langchain_openai import ChatOpenAI

# Carregar o DataFrame (ajuste o caminho conforme necessário)
df = pd.read_csv("Estoque_Veterinario.csv")

# Configurar o chat e o agente
chat = ChatOpenAI(model='gpt-3.5-turbo-0125')
agent = create_pandas_dataframe_agent(
    chat,
    df,
    verbose=True,
    agent_type='tool-calling',
    allow_dangerous_code=True  # necessário na versão 0.3 do langchain
)

def run_query():
    query = entrada.get()
    if query.strip() == "":
        saida.insert(tk.END, "Por favor, digite uma pergunta.\n")
    else:
        saida.insert(tk.END, "Processando...\n")
        try:
            result = agent.invoke({'input': query})
            saida.insert(tk.END, f"Resposta: {result}\n")
        except Exception as e:
            saida.insert(tk.END, f"Ocorreu um erro: {str(e)}\n")

# Configuração da janela principal
janela = tk.Tk()
janela.title("Agente de Estoque")

# Rótulo e entrada de texto para a consulta
rotulo = tk.Label(janela, text="Digite sua pergunta:")
rotulo.pack(pady=5)

entrada = tk.Entry(janela, width=50)
entrada.pack(pady=5)

# Botão para enviar a consulta
botao = tk.Button(janela, text="Enviar", command=run_query)
botao.pack(pady=5)

# Área de texto para exibir a resposta
saida = tk.Text(janela, height=15, width=60)
saida.pack(pady=5)

janela.mainloop()
