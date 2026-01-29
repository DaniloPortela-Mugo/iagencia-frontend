#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
timesheet_app.py

Aplicação em Tkinter para registrar tempo de trabalho por cliente/projeto,
com data automática e cálculo de horas pela diferença entre início e fim.
Também calcula custo com base no número de tokens consumidos.

Campos por registro:
1. Cliente
2. Projeto
3. Plataforma (entre opções predefinidas)
4. Data (capturada automaticamente ao “Finalizar trabalho”)
5. Horas Trabalhadas (calculada pela diferença entre início e fim)
6. Tokens Consumidos (informado manualmente)
7. Custo (calculado automaticamente)

O arquivo de armazenamento é 'timesheet.csv', criado no mesmo diretório.
"""

import csv
import os
from datetime import datetime
import tkinter as tk
from tkinter import messagebox, ttk

# ------------------------------------------------------------
# Configurações gerais
# ------------------------------------------------------------

# Custo por token (em R$). Ajuste conforme sua tabela de preços real.
CUSTO_POR_TOKEN = 0.00002  # ex.: R$ 0,00002 por token

# Nome do arquivo CSV onde os registros serão armazenados
NOME_ARQUIVO_CSV = "timesheet.csv"

# Lista de plataformas permitidas
PLATAFORMAS = [
    "Midjourney",
    "Flow",
    "Kling",
    "Google AI Studio",
    "Heygen",
    "Pika",
    "Sora",
    "Suno",
    "Gemini",
    "ChatGPT",
    "Luma AI",
    "Dreamina",
    "Higgsfilld",
    "ElevenLabs",
]


def inicializa_csv_se_necessario(nome_arquivo: str) -> None:
    """
    Cria o arquivo CSV com cabeçalho, caso ainda não exista.
    """
    if not os.path.isfile(nome_arquivo):
        with open(nome_arquivo, mode="w", newline="", encoding="utf-8") as csvfile:
            escritor = csv.writer(csvfile)
            escritor.writerow([
                "Cliente",
                "Projeto",
                "Plataforma",
                "Data",
                "Horas Trabalhadas",
                "Tokens Consumidos",
                "Custo (R$)",
            ])


def iniciar_trabalho(janela: tk.Tk,
                     entry_cliente: tk.Entry,
                     entry_projeto: tk.Entry,
                     combo_plataforma: ttk.Combobox,
                     lbl_status: tk.Label,
                     botao_iniciar: tk.Button,
                     botao_finalizar: tk.Button) -> None:
    """
    Ao clicar em 'Iniciar trabalho'. Valida campos base (cliente/projeto/plataforma),
    registra timestamp de início em janela.start_time e atualiza a interface.
    """
    cliente = entry_cliente.get().strip()
    projeto = entry_projeto.get().strip()
    plataforma = combo_plataforma.get().strip()

    # Validações básicas:
    if not cliente:
        messagebox.showerror("Erro", "O campo 'Cliente' não pode ficar vazio.")
        return
    if not projeto:
        messagebox.showerror("Erro", "O campo 'Projeto' não pode ficar vazio.")
        return
    if plataforma not in PLATAFORMAS:
        messagebox.showerror(
            "Erro",
            "Selecione uma plataforma válida na lista."
        )
        return

    # Registra início do trabalho:
    janela.start_time = datetime.now()
    janela.cliente_corrente = cliente
    janela.projeto_corrente = projeto
    janela.plataforma_corrente = plataforma

    # Bloqueia os campos para não alterar durante o trabalho:
    entry_cliente.config(state="disabled")
    entry_projeto.config(state="disabled")
    combo_plataforma.config(state="disabled")

    # Atualiza botões:
    botao_iniciar.config(state="disabled")
    botao_finalizar.config(state="normal")

    # Exibe status de início
    horario = janela.start_time.strftime("%H:%M:%S")
    lbl_status.config(text=f"Trabalho iniciado às {horario}.")


def finalizar_trabalho(janela: tk.Tk,
                       entry_cliente: tk.Entry,
                       entry_projeto: tk.Entry,
                       combo_plataforma: ttk.Combobox,
                       entry_tokens: tk.Entry,
                       lbl_status: tk.Label,
                       botao_iniciar: tk.Button,
                       botao_finalizar: tk.Button) -> None:
    """
    Ao clicar em 'Finalizar trabalho'. Verifica se há trabalho em andamento,
    calcula horas, lê tokens, calcula custo e salva no CSV. Depois limpa tudo.
    """
    # Verifica se existe um trabalho em andamento:
    if not hasattr(janela, "start_time"):
        messagebox.showerror("Erro", "Nenhum trabalho em andamento para finalizar.")
        return

    # Captura horário de término:
    end_time = datetime.now()
    delta = end_time - janela.start_time
    horas_trabalhadas = delta.total_seconds() / 3600.0

    # Formata as horas com 2 casas decimais:
    horas_str = f"{horas_trabalhadas:.2f}"

    # Data atual (dd/mm/aaaa):
    data_str = end_time.strftime("%d/%m/%Y")

    # Busca tokens consumidos:
    tokens_texto = entry_tokens.get().strip()
    try:
        tokens_consumidos = int(tokens_texto)
        if tokens_consumidos < 0:
            raise ValueError
    except ValueError:
        messagebox.showerror(
            "Erro",
            "Informe um número inteiro válido para 'Tokens Consumidos', "
            "por exemplo: 1500"
        )
        return

    # Calcula custo:
    custo = tokens_consumidos * CUSTO_POR_TOKEN
    custo_str = f"{custo:.5f}"

    # Prepara dados para salvar:
    linha = [
        janela.cliente_corrente,
        janela.projeto_corrente,
        janela.plataforma_corrente,
        data_str,
        horas_str,
        tokens_consumidos,
        custo_str,
    ]

    # Grava no CSV:
    try:
        with open(NOME_ARQUIVO_CSV, mode="a", newline="", encoding="utf-8") as csvfile:
            escritor = csv.writer(csvfile)
            escritor.writerow(linha)
    except Exception as e:
        messagebox.showerror(
            "Erro ao salvar",
            f"Ocorreu um erro ao escrever no arquivo CSV:\n{e}"
        )
        return

    # Mensagem de confirmação:
    messagebox.showinfo(
        "Sucesso",
        "Registro salvo com sucesso:\n"
        f"- Cliente: {janela.cliente_corrente}\n"
        f"- Projeto: {janela.projeto_corrente}\n"
        f"- Plataforma: {janela.plataforma_corrente}\n"
        f"- Data: {data_str}\n"
        f"- Horas: {horas_str}\n"
        f"- Tokens: {tokens_consumidos}\n"
        f"- Custo (R$): {custo_str}"
    )

    # Limpa estado e campos:
    limpar_campos(janela, entry_cliente, entry_projeto,
                  combo_plataforma, entry_tokens, lbl_status)

    # Remove atributos de estado
    delattr(janela, "start_time")
    delattr(janela, "cliente_corrente")
    delattr(janela, "projeto_corrente")
    delattr(janela, "plataforma_corrente")

    # Reabilita campos e botões
    entry_cliente.config(state="normal")
    entry_projeto.config(state="normal")
    combo_plataforma.config(state="readonly")
    botao_iniciar.config(state="normal")
    botao_finalizar.config(state="disabled")


def limpar_campos(janela: tk.Tk,
                  entry_cliente: tk.Entry,
                  entry_projeto: tk.Entry,
                  combo_plataforma: ttk.Combobox,
                  entry_tokens: tk.Entry,
                  lbl_status: tk.Label) -> None:
    """
    Limpa todos os campos da interface e reseta o rótulo de status.
    """
    entry_cliente.delete(0, tk.END)
    entry_projeto.delete(0, tk.END)
    combo_plataforma.set("")
    entry_tokens.delete(0, tk.END)
    lbl_status.config(text="")


def exibir_registros() -> None:
    """
    Abre o arquivo timesheet.csv no editor de texto padrão do sistema.
    """
    caminho = os.path.abspath(NOME_ARQUIVO_CSV)
    try:
        if os.name == "nt":  # Windows
            os.startfile(caminho)
        elif os.uname().sysname == "Darwin":  # macOS
            os.system(f"open '{caminho}'")
        else:  # Linux e outros
            os.system(f"xdg-open '{caminho}'")
    except Exception:
        messagebox.showinfo(
            "Informação",
            f"O arquivo está em:\n{caminho}\n"
            "Abra-o manualmente em um editor de texto ou planilha."
        )


def criar_janela_principal() -> None:
    """
    Cria e configura a janela principal do Tkinter com campos e botões.
    """
    janela = tk.Tk()
    janela.title("Timesheet Automático")
    janela.geometry("500x360")
    janela.resizable(False, False)

    # ---------- Labels e campos ----------
    lbl_cliente = tk.Label(janela, text="Cliente:")
    lbl_cliente.place(x=20, y=20)
    entry_cliente = tk.Entry(janela, width=40)
    entry_cliente.place(x=100, y=20)

    lbl_projeto = tk.Label(janela, text="Projeto:")
    lbl_projeto.place(x=20, y=60)
    entry_projeto = tk.Entry(janela, width=40)
    entry_projeto.place(x=100, y=60)

    lbl_plataforma = tk.Label(janela, text="Plataforma:")
    lbl_plataforma.place(x=20, y=100)
    combo_plataforma = ttk.Combobox(
        janela,
        values=PLATAFORMAS,
        state="readonly",
        width=37
    )
    combo_plataforma.place(x=100, y=100)

    lbl_tokens = tk.Label(janela, text="Tokens Consumidos:")
    lbl_tokens.place(x=20, y=140)
    entry_tokens = tk.Entry(janela, width=12)
    entry_tokens.place(x=150, y=140)

    # Rótulo de status (ex.: “Trabalho iniciado às XX:XX:XX”)
    lbl_status = tk.Label(janela, text="", fg="blue")
    lbl_status.place(x=20, y=180)

    # ---------- Botões ----------
    botao_iniciar = tk.Button(
        janela,
        text="Iniciar trabalho",
        width=20,
        command=lambda: iniciar_trabalho(
            janela,
            entry_cliente,
            entry_projeto,
            combo_plataforma,
            lbl_status,
            botao_iniciar,
            botao_finalizar
        )
    )
    botao_iniciar.place(x=150, y=220)

    botao_finalizar = tk.Button(
        janela,
        text="Finalizar trabalho",
        width=20,
        state="disabled",
        command=lambda: finalizar_trabalho(
            janela,
            entry_cliente,
            entry_projeto,
            combo_plataforma,
            entry_tokens,
            lbl_status,
            botao_iniciar,
            botao_finalizar
        )
    )
    botao_finalizar.place(x=150, y=260)

    # Botão “Exibir registros”
    botao_exibir = tk.Button(
        janela,
        text="Exibir registros",
        width=20,
        command=exibir_registros
    )
    botao_exibir.place(x=150, y=300)

    janela.mainloop()


if __name__ == "__main__":
    # Garante que o CSV exista com cabeçalho antes de abrir a interface
    inicializa_csv_se_necessario(NOME_ARQUIVO_CSV)
    criar_janela_principal()
