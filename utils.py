import json
import os

def carregar_clientes(caminho='clientes/clientes.json'):
    if not os.path.exists(caminho):
        raise FileNotFoundError(f"Arquivo de clientes não encontrado: {caminho}")
    
    with open(caminho, 'r', encoding='utf-8') as arquivo:
        try:
            return json.load(arquivo)
        except json.JSONDecodeError as e:
            raise ValueError(f"Erro ao ler o JSON de clientes: {str(e)}")
