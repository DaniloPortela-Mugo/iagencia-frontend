# utils.py

import json
import os

def carregar_clientes():
    caminho = os.path.join('clientes', 'clientes.json')
    with open(caminho, 'r', encoding='utf-8') as arquivo:
        return json.load(arquivo)