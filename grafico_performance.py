import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import os

# Estilo elegante
sns.set_theme(style="whitegrid")

# Caminho para a mesa de trabalho (desktop)
desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")

# Dados
dados = {
    'Métrica': [
        'Alcance Total', 'Investimento Total', 'Cliques', 'CTR (%)',
        'Visitas ao Site', 'Receita Total', 'Vendas', 'ROAS Geral', 'Custo por Conversão'
    ],
    'Maio': [343397, 6273, 2528, 0.7, 1181, 7695, 25, 1.23, 250.93],
    'Junho': [898623, 6829, 22061, 2.5, 10877, 458, 3, 0.07, 2276.47],
    'Julho': [478959, 2281, 5262, 1.1, 3327, 2905, 6, 1.27, 380.11]
}

# Criando o DataFrame
df = pd.DataFrame(dados)

# Criando gráficos separados por métrica e salvando como JPEG
for i, row in df.iterrows():
    plt.figure(figsize=(6, 4))
    valores = [row['Maio'], row['Junho'], row['Julho']]
    meses = ['Maio', 'Junho', 'Julho']
    ax = sns.barplot(x=meses, y=valores, palette='viridis')
    plt.title(f'{row["Métrica"]} (Maio - Julho 2025)', fontsize=14)
    plt.ylabel(row["Métrica"])
    plt.xlabel('Mês')
    ax.grid(False)

    # Adicionando os valores nas colunas
    for j, valor in enumerate(valores):
        ax.text(j, valor, f'{valor:,.2f}', ha='center', va='bottom', fontsize=10)

    plt.tight_layout()

    # Nome do arquivo e caminho
    nome_arquivo = f"{row['Métrica'].replace(' ', '_')}.jpeg"
    caminho_arquivo = os.path.join(desktop_path, nome_arquivo)
    plt.savefig(caminho_arquivo, format='jpeg')
    plt.close()
