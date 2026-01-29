import tkinter as tk
from tkinter import ttk, messagebox
import csv
from datetime import datetime
import os

# --- Configurações ---
CUSTO_POR_TOKEN = {
    "Midjourney": 0.0001,
    "Flow": 0.00005,
    "Kling": 0.0002,
    "Google AI Studio": 0.00008,
    "Heygen": 0.00015,
    "Pika": 0.00007,
    "Sora": 0.00025,
    "Suno": 0.00006,
    "Gemini": 0.00009,
    "ChatGPT": 0.00012,
    "Luma AI": 0.00018,
    "Dreamina": 0.00011,
    "Higgsfilld": 0.00013,
    "ElevenLabs": 0.0001,
}

ARQUIVO_TIMESHEET = "timesheet_projetos.csv"
PLATAFORMAS = list(CUSTO_POR_TOKEN.keys())

# Variáveis globais para armazenar o estado do projeto
hora_inicio_projeto_dt = None
hora_fim_projeto_dt = None


# --- Funções do Aplicativo ---

def iniciar_projeto():
    """Registra a data e hora de início do projeto."""
    global hora_inicio_projeto_dt

    cliente = entry_cliente.get().strip()
    projeto = entry_projeto.get().strip()
    plataforma = combo_plataforma.get().strip()

    if not all([cliente, projeto, plataforma]):
        messagebox.showerror("Erro", "Por favor, preencha Cliente, Projeto e Plataforma antes de iniciar.")
        return

    if hora_inicio_projeto_dt:
        messagebox.showwarning("Aviso", "Um projeto já está em andamento. Finalize-o antes de iniciar um novo.")
        return

    hora_inicio_projeto_dt = datetime.now()

    btn_iniciar.config(state=tk.DISABLED)
    btn_finalizar.config(state=tk.NORMAL)

    entry_cliente.config(state='readonly')
    entry_projeto.config(state='readonly')
    combo_plataforma.config(state='disabled')

    messagebox.showinfo(
        "Projeto Iniciado",
        f"Projeto '{projeto}' para o cliente '{cliente}' iniciado em "
        f"{hora_inicio_projeto_dt.strftime('%d/%m/%Y')} às {hora_inicio_projeto_dt.strftime('%H:%M:%S')}."
    )


def finalizar_projeto():
    """Registra a data e hora de fim, calcula as horas e salva o registro."""
    global hora_inicio_projeto_dt, hora_fim_projeto_dt

    if not hora_inicio_projeto_dt:
        messagebox.showwarning("Aviso", "Nenhum projeto em andamento para finalizar.")
        return

    cliente = entry_cliente.get().strip()
    projeto = entry_projeto.get().strip()
    plataforma = combo_plataforma.get().strip()

    hora_fim_projeto_dt = datetime.now()

    # Calcula horas trabalhadas
    tempo_trabalhado = hora_fim_projeto_dt - hora_inicio_projeto_dt
    total_horas = tempo_trabalhado.total_seconds() / 3600  # em horas

    # Tokens sempre zero (não há campo na interface)
    tokens = 0
    custo_por_token_plataforma = CUSTO_POR_TOKEN.get(plataforma, 0)
    custo_total_tokens = tokens * custo_por_token_plataforma

    cabecalho = [
        "Cliente", "Projeto", "Plataforma",
        "Data Início", "Hora Início",
        "Data Fim", "Hora Fim",
        "Horas Trabalhadas (h)", "Tokens Consumidos", "Custo Tokens (R$)"
    ]

    arquivo_existe = os.path.exists(ARQUIVO_TIMESHEET)
    modo_abertura = 'a' if arquivo_existe else 'w'

    with open(ARQUIVO_TIMESHEET, mode=modo_abertura, newline='', encoding="utf-8") as file:
        writer = csv.writer(file)
        if not arquivo_existe:
            writer.writerow(cabecalho)
        writer.writerow([
            cliente,
            projeto,
            plataforma,
            hora_inicio_projeto_dt.strftime("%d/%m/%Y"),
            hora_inicio_projeto_dt.strftime("%H:%M:%S"),
            hora_fim_projeto_dt.strftime("%d/%m/%Y"),
            hora_fim_projeto_dt.strftime("%H:%M:%S"),
            f"{total_horas:.2f}",
            tokens,
            f"{custo_total_tokens:.2f}"
        ])

    messagebox.showinfo(
        "Projeto Finalizado",
        f"Projeto '{projeto}' finalizado. Horas trabalhadas: {total_horas:.2f}h."
    )

    hora_inicio_projeto_dt = None
    hora_fim_projeto_dt = None

    limpar_campos()
    atualizar_exibicao_dados()

    btn_iniciar.config(state=tk.NORMAL)
    btn_finalizar.config(state=tk.DISABLED)
    entry_cliente.config(state='normal')
    entry_projeto.config(state='normal')
    combo_plataforma.config(state='readonly')


def limpar_campos():
    """Limpa os campos de entrada do formulário para um novo timesheet."""
    entry_cliente.delete(0, tk.END)
    entry_projeto.delete(0, tk.END)
    combo_plataforma.set("")

    entry_data_fim_display.config(state='normal')
    entry_data_fim_display.delete(0, tk.END)
    entry_data_fim_display.config(state='readonly')

    entry_hora_fim_display.config(state='normal')
    entry_hora_fim_display.delete(0, tk.END)
    entry_hora_fim_display.config(state='readonly')


def carregar_dados():
    """Carrega os dados existentes do arquivo CSV."""
    dados = []
    if os.path.exists(ARQUIVO_TIMESHEET):
        with open(ARQUIVO_TIMESHEET, mode='r', newline='', encoding="utf-8") as file:
            reader = csv.reader(file)
            header = next(reader, None)
            if header:
                for row in reader:
                    dados.append(row)
    return dados


def atualizar_exibicao_dados():
    """Atualiza a Treeview com os dados do timesheet."""
    for i in tree.get_children():
        tree.delete(i)

    dados = carregar_dados()
    for row in dados:
        tree.insert("", tk.END, values=row)


def calcular_gastos():
    """Calcula e exibe o gasto total por cliente e plataforma."""
    if not os.path.exists(ARQUIVO_TIMESHEET):
        messagebox.showinfo("Aviso", "Nenhum timesheet encontrado.")
        return

    gastos = {}
    with open(ARQUIVO_TIMESHEET, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            messagebox.showinfo("Aviso", "Arquivo vazio.")
            return

        for row in reader:
            try:
                cliente = row[0]
                plataforma = row[2]
                custo = float(row[9])
            except (IndexError, ValueError):
                continue

            if cliente not in gastos:
                gastos[cliente] = {}
            gastos[cliente][plataforma] = gastos[cliente].get(plataforma, 0.0) + custo

    if not gastos:
        messagebox.showinfo("Aviso", "Não há dados válidos para calcular.")
        return

    # Cria janela para exibir os resultados
    janela = tk.Toplevel(root)
    janela.title("Gasto por Cliente e Plataforma")
    janela.geometry("600x400")

    frame = ttk.LabelFrame(janela, text="Resumo de Gastos", padding=10)
    frame.pack(fill="both", expand=True, padx=10, pady=10)

    colunas = ("Cliente", "Plataforma", "Gasto Total (R$)")
    tree_gastos = ttk.Treeview(frame, columns=colunas, show="headings")
    for col in colunas:
        tree_gastos.heading(col, text=col)
        if col == "Cliente":
            tree_gastos.column(col, width=200, anchor="w")
        elif col == "Plataforma":
            tree_gastos.column(col, width=150, anchor="center")
        else:
            tree_gastos.column(col, width=120, anchor="e")
    tree_gastos.pack(fill="both", expand=True, side="left")

    sb = ttk.Scrollbar(frame, orient="vertical", command=tree_gastos.yview)
    tree_gastos.configure(yscrollcommand=sb.set)
    sb.pack(side="right", fill="y")

    for cliente in sorted(gastos):
        for plataforma in sorted(gastos[cliente]):
            valor = gastos[cliente][plataforma]
            tree_gastos.insert("", tk.END, values=(cliente, plataforma, f"{valor:.2f}"))


# --- Configuração da Interface Gráfica ---

root = tk.Tk()
root.title("Gerenciador de Projetos da Agência")
root.geometry("1100x700")

# Frame para o formulário de entrada de dados
frame_entrada = ttk.LabelFrame(root, text="Informações do Projeto", padding="10")
frame_entrada.pack(pady=10, padx=10, fill="x")

# Widgets de entrada
labels_info = [
    ("Cliente:", "entry_cliente"),
    ("Projeto:", "entry_projeto"),
    ("Plataforma:", "combo_plataforma"),
]

entry_widgets = {}

for i, (label_text, var_name) in enumerate(labels_info):
    ttk.Label(frame_entrada, text=label_text).grid(row=i, column=0, padx=5, pady=5, sticky="w")

    if var_name == "combo_plataforma":
        combo_plataforma = ttk.Combobox(frame_entrada, values=PLATAFORMAS, state="readonly")
        combo_plataforma.grid(row=i, column=1, padx=5, pady=5, sticky="ew")
        entry_widgets[var_name] = combo_plataforma
    else:
        entry_widget = ttk.Entry(frame_entrada, state='normal')
        entry_widget.grid(row=i, column=1, padx=5, pady=5, sticky="ew")
        entry_widgets[var_name] = entry_widget

# Atribuir referências globais
entry_cliente = entry_widgets["entry_cliente"]
entry_projeto = entry_widgets["entry_projeto"]
combo_plataforma = entry_widgets["combo_plataforma"]

# Campos de exibição para Data/Hora Fim (serão preenchidos ao finalizar)
ttk.Label(frame_entrada, text="Data Fim:").grid(row=len(labels_info), column=0, padx=5, pady=5, sticky="w")
entry_data_fim_display = ttk.Entry(frame_entrada, state='readonly')
entry_data_fim_display.grid(row=len(labels_info), column=1, padx=5, pady=5, sticky="ew")

ttk.Label(frame_entrada, text="Hora Fim:").grid(row=len(labels_info) + 1, column=0, padx=5, pady=5, sticky="w")
entry_hora_fim_display = ttk.Entry(frame_entrada, state='readonly')
entry_hora_fim_display.grid(row=len(labels_info) + 1, column=1, padx=5, pady=5, sticky="ew")

# Botões de Ação (mesma linha: Iniciar, Finalizar e Calcular Gastos)
btn_iniciar = ttk.Button(frame_entrada, text="Iniciar Projeto", command=iniciar_projeto)
btn_iniciar.grid(row=len(labels_info) + 2, column=0, pady=10)

btn_finalizar = ttk.Button(frame_entrada, text="Finalizar Projeto", command=finalizar_projeto, state=tk.DISABLED)
btn_finalizar.grid(row=len(labels_info) + 2, column=1, pady=10)

btn_calcular = ttk.Button(frame_entrada, text="Calcular Gastos", command=calcular_gastos)
btn_calcular.grid(row=len(labels_info) + 2, column=2, pady=10, padx=5)

# Frame para exibir os dados (Treeview)
frame_exibicao = ttk.LabelFrame(root, text="Histórico de Projetos", padding="10")
frame_exibicao.pack(pady=10, padx=10, fill="both", expand=True)

colunas = (
    "Cliente", "Projeto", "Plataforma", "Data Início", "Hora Início",
    "Data Fim", "Hora Fim", "Horas Trabalhadas (h)", "Tokens Consumidos", "Custo Tokens (R$)"
)
tree = ttk.Treeview(frame_exibicao, columns=colunas, show="headings")
for col in colunas:
    tree.heading(col, text=col)
    tree.column(col, width=100, anchor="center")
tree.pack(fill="both", expand=True)

scrollbar = ttk.Scrollbar(frame_exibicao, orient="vertical", command=tree.yview)
tree.configure(yscrollcommand=scrollbar.set)
scrollbar.pack(side="right", fill="y")

atualizar_exibicao_dados()

root.mainloop()
