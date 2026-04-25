import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Configurações globais
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 10
plt.rcParams['figure.dpi'] = 300

# Caminhos dos arquivos
PASTA_DADOS = "/Users/daniloportela/Desktop/VOX Strategy/TreeLife/RELATORIOS"
PASTA_GRAFICOS = "/Users/daniloportela/Desktop/VOX Strategy/TreeLife/RELATORIOS/Graficos"

# Criar pasta de gráficos se não existir
os.makedirs(PASTA_GRAFICOS, exist_ok=True)

print("=== GERADOR DE GRÁFICOS CORRIGIDO TREELIFE ===")
print(f"Pasta de dados: {PASTA_DADOS}")
print(f"Pasta de gráficos: {PASTA_GRAFICOS}")
print("CORREÇÃO: Categorização de produtos aprimorada")
print("="*50)

def categorizar_produto_corrigido(nome):
    """
    Categoriza produtos baseado no nome - VERSÃO CORRIGIDA
    
    CORREÇÃO: Prioriza COMBOS sobre ingredientes individuais
    Isso resolve o problema onde produtos como "ÔMEGA 3 NEURAL, 1 × COMPLEXO VITAMÍNICO"
    eram categorizados como ÔMEGA quando deveriam ser COMBOS
    """
    nome_upper = str(nome).upper()
    
    # PRIORIDADE 1: Combos e Kits (devem vir PRIMEIRO)
    if any(word in nome_upper for word in ['COMBO', '×', 'KIT', ', 1 ×', ', 2 ×', ', 3 ×', ' X ', ' + ']):
        return 'COMBOS'
    
    # PRIORIDADE 2: Categorias específicas (só se NÃO for combo)
    elif any(word in nome_upper for word in ['ÔMEGA', 'OMEGA']):
        return 'ÔMEGA'
    elif any(word in nome_upper for word in ['VITAMINA', 'COMPLEXO', 'VITALIFE']):
        return 'VITAMINAS'
    elif any(word in nome_upper for word in ['PEPTISTRONG', 'PROTEÍNA', 'PROTEIN']):
        return 'PROTEÍNAS'
    elif any(word in nome_upper for word in ['GARLIC', 'MAGNÉSIO', 'LOW HOMOCYSTEINE', 'AKKERMAT']):
        return 'SUPLEMENTOS'
    elif any(word in nome_upper for word in ['BURNKCAL', 'EMAGRECIMENTO']):
        return 'EMAGRECIMENTO'
    elif any(word in nome_upper for word in ['DEEP SLEEP', 'STRESS', 'SONO']):
        return 'SONO/STRESS'
    elif any(word in nome_upper for word in ['BELEZA', 'MÁSCARA', 'ANTI RUGAS', 'CRESCIMENTO']):
        return 'BELEZA'
    elif any(word in nome_upper for word in ['DISBIOLIFE', 'DIGESTÃO', 'PROBIÓTICO']):
        return 'DIGESTÃO'
    else:
        return 'OUTROS'

def carregar_dados():
    """Carrega e processa os dados dos arquivos Excel"""
    print("Carregando dados...")
    
    try:
        # Carregar dados de produtos
        df_produtos = pd.read_excel(os.path.join(PASTA_DADOS, 'Vendas_por_Produto.xlsx'))
        
        # Limpar e processar dados de produtos
        produtos_clean = df_produtos.dropna(subset=[df_produtos.columns[0]]).copy()
        produtos_clean.columns = ['Produto', 'Num_Pedidos', 'Perc_Pedidos', 'Total_Vendas', 'Perc_Receita']
        produtos_clean = produtos_clean[produtos_clean['Num_Pedidos'] > 0]
        produtos_clean['Ticket_Medio'] = produtos_clean['Total_Vendas'] / produtos_clean['Num_Pedidos']
        
        # USAR A FUNÇÃO CORRIGIDA
        produtos_clean['Categoria'] = produtos_clean['Produto'].apply(categorizar_produto_corrigido)
        
        print(f"✓ Produtos carregados: {len(produtos_clean)} itens")
        
        # Mostrar estatísticas de categorização corrigida
        print("\n📊 CATEGORIZAÇÃO CORRIGIDA:")
        categoria_stats = produtos_clean.groupby('Categoria').agg({
            'Produto': 'count',
            'Total_Vendas': 'sum'
        }).round(2)
        categoria_stats = categoria_stats.sort_values('Total_Vendas', ascending=False)
        
        print(f"{'Categoria':<15} | {'Produtos':<9} | {'Receita (R$)':<12}")
        print("-" * 45)
        for cat, row in categoria_stats.iterrows():
            print(f"{cat:<15} | {row['Produto']:>9} | {row['Total_Vendas']:>12,.0f}")
        
        # Carregar dados de canais
        df_canais = pd.read_excel(os.path.join(PASTA_DADOS, 'Contribuicao_Canais_Treelife_2025.xlsx'))
        canais_clean = df_canais.dropna(subset=[df_canais.columns[0]]).copy()
        canais_clean.columns = ['Canal', 'Num_Pedidos', 'Perc_Pedidos', 'Total_Vendas', 'Perc_Receita']
        canais_clean = canais_clean[canais_clean['Num_Pedidos'] > 0]
        canais_clean['Ticket_Medio'] = canais_clean['Total_Vendas'] / canais_clean['Num_Pedidos']
        
        # Calcular eficiência dos canais
        ticket_medio_geral = canais_clean['Total_Vendas'].sum() / canais_clean['Num_Pedidos'].sum()
        canais_clean['Eficiencia'] = canais_clean['Ticket_Medio'] / ticket_medio_geral
        
        print(f"✓ Canais carregados: {len(canais_clean)} itens")
        
        return produtos_clean, canais_clean
        
    except Exception as e:
        print(f"❌ Erro ao carregar dados: {e}")
        return None, None

def mostrar_produtos_por_categoria(produtos_clean):
    """Mostra produtos por categoria para verificação"""
    print("\n" + "="*60)
    print("VERIFICAÇÃO: PRODUTOS POR CATEGORIA")
    print("="*60)
    
    for categoria in sorted(produtos_clean['Categoria'].unique()):
        produtos_cat = produtos_clean[produtos_clean['Categoria'] == categoria]
        receita_cat = produtos_cat['Total_Vendas'].sum()
        
        print(f"\n📂 {categoria} ({len(produtos_cat)} produtos - R$ {receita_cat:,.2f}):")
        print("-" * 50)
        
        # Mostrar top 5 produtos da categoria
        top_produtos = produtos_cat.nlargest(5, 'Total_Vendas')
        for idx, row in top_produtos.iterrows():
            produto_nome = row['Produto'][:45] + '...' if len(row['Produto']) > 45 else row['Produto']
            print(f"   • {produto_nome} - R$ {row['Total_Vendas']:,.2f}")
        
        if len(produtos_cat) > 5:
            print(f"   ... e mais {len(produtos_cat) - 5} produtos")

# ==================== GRÁFICOS (usando as mesmas funções do script anterior) ====================

def gerar_grafico_1_top_produtos(produtos_clean):
    """Gráfico 1: Top 15 Produtos por Receita"""
    print("Gerando: Top 15 Produtos por Receita...")
    
    plt.figure(figsize=(14, 10))
    top15_produtos = produtos_clean.nlargest(15, 'Total_Vendas')
    
    bars = plt.barh(range(len(top15_produtos)), top15_produtos['Total_Vendas'], color='steelblue')
    plt.yticks(range(len(top15_produtos)), 
               [prod[:35] + '...' if len(prod) > 35 else prod for prod in top15_produtos['Produto']])
    plt.xlabel('Receita (R$)', fontsize=12)
    plt.title('Top 15 Produtos por Receita', fontsize=16, fontweight='bold', pad=20)
    plt.gca().invert_yaxis()
    
    # Adicionar valores nas barras
    for i, (bar, value) in enumerate(zip(bars, top15_produtos['Total_Vendas'])):
        plt.text(value + 200, i, f'R$ {value:,.0f}', va='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '01_top_produtos_receita_corrigido.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_2_receita_categoria(produtos_clean):
    """Gráfico 2: Receita por Categoria de Produto (Barras Horizontais) - CORRIGIDO"""
    print("Gerando: Receita por Categoria de Produto (CORRIGIDO)...")
    
    plt.figure(figsize=(12, 8))
    categoria_stats = produtos_clean.groupby('Categoria')['Total_Vendas'].sum().sort_values(ascending=True)
    
    bars = plt.barh(range(len(categoria_stats)), categoria_stats.values, color='lightcoral', alpha=0.8)
    plt.yticks(range(len(categoria_stats)), categoria_stats.index)
    plt.xlabel('Receita (R$)', fontsize=12)
    plt.title('Receita por Categoria de Produto (CORRIGIDO)', fontsize=16, fontweight='bold', pad=20)
    
    # Adicionar valores nas barras
    for i, (bar, value) in enumerate(zip(bars, categoria_stats.values)):
        plt.text(value + 500, i, f'R$ {value:,.0f}', va='center', fontsize=10)
    
    # Adicionar nota sobre correção
    plt.figtext(0.02, 0.02, 'CORREÇÃO: Combos agora categorizados corretamente', 
                fontsize=8, style='italic', color='red')
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '02_receita_categoria_corrigido.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_comparacao_categorizacao(produtos_clean):
    """Gráfico extra: Comparação antes/depois da correção"""
    print("Gerando: Comparação Categorização Antes/Depois...")
    
    # Simular categorização antiga (sem correção)
    def categorizar_produto_antigo(nome):
        nome_upper = str(nome).upper()
        if any(word in nome_upper for word in ['ÔMEGA', 'OMEGA']):
            return 'ÔMEGA'
        elif any(word in nome_upper for word in ['COMBO', '×', 'KIT']):
            return 'COMBOS'
        # ... outras categorias
        else:
            return 'OUTROS'
    
    # Aplicar categorização antiga
    produtos_clean['Categoria_Antiga'] = produtos_clean['Produto'].apply(categorizar_produto_antigo)
    
    # Comparar totais
    antiga = produtos_clean.groupby('Categoria_Antiga')['Total_Vendas'].sum()
    nova = produtos_clean.groupby('Categoria')['Total_Vendas'].sum()
    
    # Focar na diferença ÔMEGA vs COMBOS
    omega_antigo = antiga.get('ÔMEGA', 0)
    omega_novo = nova.get('ÔMEGA', 0)
    combos_antigo = antiga.get('COMBOS', 0)
    combos_novo = nova.get('COMBOS', 0)
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
    
    # Gráfico 1: Categorização Antiga
    categorias_antigas = ['ÔMEGA', 'COMBOS']
    valores_antigos = [omega_antigo, combos_antigo]
    bars1 = ax1.bar(categorias_antigas, valores_antigos, color=['lightcoral', 'lightblue'], alpha=0.7)
   # ax1.set_title('Categorização ANTES da Correção', fontsize=14, fontweight='bold')
    ax1.set_ylabel('Receita (R$)')
    
    for bar, value in zip(bars1, valores_antigos):
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1000, 
                f'R$ {value:,.0f}', ha='center', va='bottom', fontsize=10)
    
    # Gráfico 2: Categorização Nova
    categorias_novas = ['ÔMEGA', 'COMBOS']
    valores_novos = [omega_novo, combos_novo]
    bars2 = ax2.bar(categorias_novas, valores_novos, color=['green', 'orange'], alpha=0.7)
    #ax2.set_title('Categorização', fontsize=14, fontweight='bold')
    ax2.set_ylabel('Receita (R$)')
    
    for bar, value in zip(bars2, valores_novos):
        ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1000, 
                f'R$ {value:,.0f}', ha='center', va='bottom', fontsize=10)
    
    # Adicionar diferenças
    diff_omega = omega_novo - omega_antigo
    diff_combos = combos_novo - combos_antigo
    
    plt.figtext(0.5, 0.02, f'CORREÇÃO: ÔMEGA {diff_omega:+,.0f} | COMBOS {diff_combos:+,.0f}', 
                ha='center', fontsize=12, fontweight='bold', color='red')
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '00_comparacao_categorizacao.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

# ==================== GRÁFICOS DE PRODUTOS ====================

def gerar_grafico_1_top_produtos(produtos_clean):
    """Gráfico 1: Top 15 Produtos por Receita"""
    print("Gerando: Top 15 Produtos por Receita...")
    
    plt.figure(figsize=(14, 10))
    top15_produtos = produtos_clean.nlargest(15, 'Total_Vendas')
    
    bars = plt.barh(range(len(top15_produtos)), top15_produtos['Total_Vendas'], color='steelblue')
    plt.yticks(range(len(top15_produtos)), 
               [prod[:35] + '...' if len(prod) > 35 else prod for prod in top15_produtos['Produto']])
    plt.xlabel('Receita (R$)', fontsize=12)
    plt.title('Top 15 Produtos por Receita', fontsize=16, fontweight='bold', pad=20)
    plt.gca().invert_yaxis()
    
    # Adicionar valores nas barras
    for i, (bar, value) in enumerate(zip(bars, top15_produtos['Total_Vendas'])):
        plt.text(value + 200, i, f'R$ {value:,.0f}', va='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '01_top_produtos_receita.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_2_receita_categoria(produtos_clean):
    """Gráfico 2: Receita por Categoria de Produto (Barras Horizontais)"""
    print("Gerando: Receita por Categoria de Produto...")
    
    plt.figure(figsize=(12, 8))
    categoria_stats = produtos_clean.groupby('Categoria')['Total_Vendas'].sum().sort_values(ascending=True)
    
    bars = plt.barh(range(len(categoria_stats)), categoria_stats.values, color='lightcoral', alpha=0.8)
    plt.yticks(range(len(categoria_stats)), categoria_stats.index)
    plt.xlabel('Receita (R$)', fontsize=12)
    plt.title('Receita por Categoria de Produto', fontsize=16, fontweight='bold', pad=20)
    
    # Adicionar valores nas barras
    for i, (bar, value) in enumerate(zip(bars, categoria_stats.values)):
        plt.text(value + 500, i, f'R$ {value:,.0f}', va='center', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '02_receita_categoria.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_3_distribuicao_pedidos(produtos_clean):
    """Gráfico 3: Distribuição de Pedidos por Produto"""
    print("Gerando: Distribuição de Pedidos por Produto...")
    
    plt.figure(figsize=(12, 8))
    plt.hist(produtos_clean['Num_Pedidos'], bins=20, alpha=0.7, color='lightgreen', edgecolor='black')
    plt.axvline(produtos_clean['Num_Pedidos'].mean(), color='red', linestyle='--', 
               label=f'Média: {produtos_clean["Num_Pedidos"].mean():.1f}')
    plt.axvline(produtos_clean['Num_Pedidos'].median(), color='blue', linestyle='--', 
               label=f'Mediana: {produtos_clean["Num_Pedidos"].median():.1f}')
    plt.xlabel('Número de Pedidos', fontsize=12)
    plt.ylabel('Número de Produtos', fontsize=12)
    plt.title('Distribuição de Pedidos por Produto', fontsize=16, fontweight='bold', pad=20)
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '03_distribuicao_pedidos.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_4_scatter_pedidos_receita(produtos_clean):
    """Gráfico 4: Relação Pedidos vs Receita"""
    print("Gerando: Relação Pedidos vs Receita...")
    
    plt.figure(figsize=(12, 8))
    scatter = plt.scatter(produtos_clean['Num_Pedidos'], produtos_clean['Total_Vendas'], 
                         alpha=0.6, s=60, c=produtos_clean['Ticket_Medio'], cmap='viridis')
    plt.xlabel('Número de Pedidos', fontsize=12)
    plt.ylabel('Receita (R$)', fontsize=12)
    plt.title('Relação Pedidos vs Receita (cor = ticket médio)', fontsize=16, fontweight='bold', pad=20)
    
    # Adicionar colorbar
    cbar = plt.colorbar(scatter)
    cbar.set_label('Ticket Médio (R$)')
    
    # Destacar produtos estrela
    produtos_estrela = produtos_clean[produtos_clean['Num_Pedidos'] > 10]
    for idx, row in produtos_estrela.nlargest(5, 'Total_Vendas').iterrows():
        plt.annotate(row['Produto'][:15], 
                    (row['Num_Pedidos'], row['Total_Vendas']),
                    xytext=(5, 5), textcoords='offset points', fontsize=8)
    
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '04_scatter_pedidos_receita.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_5_pareto_produtos(produtos_clean):
    """Gráfico 5: Análise de Pareto com nomes dos produtos"""
    print("Gerando: Análise de Pareto...")
    
    plt.figure(figsize=(16, 10))
    
    produtos_pareto = produtos_clean.sort_values('Total_Vendas', ascending=False).reset_index(drop=True)
    produtos_pareto['Receita_Acumulada'] = produtos_pareto['Total_Vendas'].cumsum()
    produtos_pareto['Perc_Acumulada'] = (produtos_pareto['Receita_Acumulada'] / produtos_clean['Total_Vendas'].sum()) * 100
    
    # Mostrar top 30 para visualização
    top30 = produtos_pareto.head(30)
    
    # Gráfico de barras
    fig, ax1 = plt.subplots(figsize=(16, 10))
    bars = ax1.bar(range(len(top30)), top30['Total_Vendas'], alpha=0.7, color='skyblue')
    ax1.set_xlabel('Produtos (ordenados por receita)', fontsize=12)
    ax1.set_ylabel('Receita (R$)', color='blue', fontsize=12)
    ax1.tick_params(axis='y', labelcolor='blue')
    
    # Adicionar nomes dos produtos no eixo X
    ax1.set_xticks(range(len(top30)))
    ax1.set_xticklabels([prod[:20] + '...' if len(prod) > 20 else prod 
                        for prod in top30['Produto']], rotation=45, ha='right')
    
    # Linha acumulada
    ax2 = ax1.twinx()
    line = ax2.plot(range(len(top30)), top30['Perc_Acumulada'], 
                   color='red', marker='o', linewidth=2, markersize=4)
    ax2.set_ylabel('% Receita Acumulada', color='red', fontsize=12)
    ax2.tick_params(axis='y', labelcolor='red')
    ax2.axhline(y=80, color='red', linestyle='--', alpha=0.7, label='80%')
    
    plt.title('Análise de Pareto - Top 30 Produtos', fontsize=16, fontweight='bold', pad=20)
    ax2.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '05_pareto_produtos.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_6_matriz_segmentacao(produtos_clean):
    """Gráfico 6: Matriz de Segmentação BCG"""
    print("Gerando: Matriz de Segmentação...")
    
    plt.figure(figsize=(14, 10))
    
    # Calcular quartis para segmentação
    q_pedidos = produtos_clean['Num_Pedidos'].quantile([0.25, 0.5, 0.75])
    q_ticket = produtos_clean['Ticket_Medio'].quantile([0.25, 0.5, 0.75])
    
    # Criar segmentos
    def segmentar_produto(row):
        pedidos = row['Num_Pedidos']
        ticket = row['Ticket_Medio']
        
        if pedidos >= q_pedidos[0.75] and ticket >= q_ticket[0.75]:
            return 'ESTRELAS'
        elif pedidos >= q_pedidos[0.75] and ticket < q_ticket[0.75]:
            return 'VACAS LEITEIRAS'
        elif pedidos < q_pedidos[0.75] and ticket >= q_ticket[0.75]:
            return 'INTERROGAÇÕES'
        else:
            return 'ABACAXIS'
    
    produtos_clean['Segmento'] = produtos_clean.apply(segmentar_produto, axis=1)
    
    # Cores para cada segmento
    cores_segmento = {
        'ESTRELAS': 'gold',
        'VACAS LEITEIRAS': 'green',
        'INTERROGAÇÕES': 'orange',
        'ABACAXIS': 'red'
    }
    
    # Scatter plot com segmentação
    for segmento in produtos_clean['Segmento'].unique():
        dados_seg = produtos_clean[produtos_clean['Segmento'] == segmento]
        plt.scatter(dados_seg['Num_Pedidos'], dados_seg['Ticket_Medio'], 
                   c=cores_segmento[segmento], label=segmento, alpha=0.7, s=80)
    
    plt.axvline(q_pedidos[0.75], color='gray', linestyle='--', alpha=0.5)
    plt.axhline(q_ticket[0.75], color='gray', linestyle='--', alpha=0.5)
    
    plt.xlabel('Número de Pedidos', fontsize=12)
    plt.ylabel('Ticket Médio (R$)', fontsize=12)
    plt.title('Matriz de Segmentação de Produtos', fontsize=16, fontweight='bold', pad=20)
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '06_matriz_segmentacao.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_7_ticket_medio_categoria(produtos_clean):
    """Gráfico 7: Ticket Médio por Categoria (Barras Horizontais)"""
    print("Gerando: Ticket Médio por Categoria...")
    
    plt.figure(figsize=(12, 8))
    categoria_ticket = produtos_clean.groupby('Categoria')['Ticket_Medio'].mean().sort_values(ascending=True)
    
    bars = plt.barh(range(len(categoria_ticket)), categoria_ticket.values, 
                   color='orange', alpha=0.8)
    plt.yticks(range(len(categoria_ticket)), categoria_ticket.index)
    plt.xlabel('Ticket Médio (R$)', fontsize=12)
    plt.title('Ticket Médio por Categoria', fontsize=16, fontweight='bold', pad=20)
    
    # Adicionar valores nas barras
    for i, (bar, value) in enumerate(zip(bars, categoria_ticket.values)):
        plt.text(value + 10, i, f'R$ {value:.0f}', va='center', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '07_ticket_medio_categoria.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_8_concentracao_receita(produtos_clean):
    """Gráfico 8: Concentração de Receita (Pizza)"""
    print("Gerando: Concentração de Receita...")
    
    plt.figure(figsize=(12, 8))
    categoria_receita = produtos_clean.groupby('Categoria')['Total_Vendas'].sum().sort_values(ascending=False)
    
    # Agrupar categorias menores em "Outros" se necessário
    if len(categoria_receita) > 8:
        top_categorias = categoria_receita.head(7)
        outros = categoria_receita.tail(len(categoria_receita) - 7).sum()
        categoria_receita = pd.concat([top_categorias, pd.Series([outros], index=['Outros'])])
    
    colors = plt.cm.Set3(np.linspace(0, 1, len(categoria_receita)))
    
    wedges, texts, autotexts = plt.pie(categoria_receita.values, 
                                      labels=categoria_receita.index, 
                                      autopct='%1.1f%%', 
                                      colors=colors, 
                                      startangle=90)
    
    plt.title('Concentração de Receita por Categoria', fontsize=16, fontweight='bold', pad=20)
    
    # Adicionar legenda com valores
    legend_labels = [f'{cat}: R$ {val:,.0f}' for cat, val in categoria_receita.items()]
    plt.legend(wedges, legend_labels, title="Categorias", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1))
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '08_concentracao_receita.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_9_correlacoes(produtos_clean):
    """Gráfico 9: Heatmap de Correlações"""
    print("Gerando: Heatmap de Correlações...")
    
    plt.figure(figsize=(10, 8))
    
    # Preparar dados para correlação
    dados_corr = produtos_clean[['Num_Pedidos', 'Total_Vendas', 'Perc_Receita', 'Ticket_Medio']].copy()
    dados_corr.columns = ['Pedidos', 'Receita', '% Receita', 'Ticket Médio']
    
    # Calcular correlações
    correlacoes = dados_corr.corr()
    
    # Criar heatmap
    sns.heatmap(correlacoes, annot=True, cmap='RdYlBu_r', center=0, 
                square=True, fmt='.3f', cbar_kws={'label': 'Correlação'})
    plt.title('Matriz de Correlação - Métricas de Produtos', fontsize=16, fontweight='bold', pad=20)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '09_correlacoes_produtos.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_10_receita_crescimento(produtos_clean):
    """Gráfico 10: Receita por Categoria - Base para Crescimento (Barras Horizontais)"""
    print("Gerando: Receita por Categoria - Base para Crescimento...")
    
    plt.figure(figsize=(14, 8))
    categorias_sorted = produtos_clean.groupby('Categoria')['Total_Vendas'].sum().sort_values(ascending=True)
    
    # Receita atual
    bars1 = plt.barh(range(len(categorias_sorted)), categorias_sorted.values, 
                    alpha=0.7, color='steelblue', label='Receita Atual')
    
    # Potencial de crescimento (+20%)
    potencial = categorias_sorted.values * 0.2
    bars2 = plt.barh(range(len(categorias_sorted)), potencial, 
                    left=categorias_sorted.values, alpha=0.5, color='orange', label='Potencial +20%')
    
    plt.yticks(range(len(categorias_sorted)), categorias_sorted.index)
    plt.xlabel('Receita (R$)', fontsize=12)
    plt.title('Receita por Categoria - Base para Crescimento', fontsize=16, fontweight='bold', pad=20)
    plt.legend()
    
    # Adicionar valores
    for i, (atual, pot) in enumerate(zip(categorias_sorted.values, potencial)):
        plt.text(atual/2, i, f'R$ {atual:,.0f}', va='center', ha='center', fontsize=9, color='white', fontweight='bold')
        plt.text(atual + pot/2, i, f'+R$ {pot:,.0f}', va='center', ha='center', fontsize=8)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '10_receita_crescimento.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

# ==================== GRÁFICOS DE CANAIS ====================

def gerar_grafico_11_top_canais_receita(canais_clean):
    """Gráfico 11: Top 10 Canais por Receita"""
    print("Gerando: Top 10 Canais por Receita...")
    
    plt.figure(figsize=(14, 10))
    top10_canais = canais_clean.nlargest(10, 'Total_Vendas')
    
    bars = plt.barh(range(len(top10_canais)), top10_canais['Total_Vendas'], color='darkblue')
    plt.yticks(range(len(top10_canais)), 
               [canal[:40] + '...' if len(canal) > 40 else canal for canal in top10_canais['Canal']])
    plt.xlabel('Receita (R$)', fontsize=12)
    plt.title('Top 10 Canais por Receita', fontsize=16, fontweight='bold', pad=20)
    plt.gca().invert_yaxis()
    
    # Adicionar valores nas barras
    for i, (bar, value) in enumerate(zip(bars, top10_canais['Total_Vendas'])):
        plt.text(value + 500, i, f'R$ {value:,.0f}', va='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '11_top_canais_receita.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_12_eficiencia_canais(canais_clean):
    """Gráfico 12: Eficiência dos Canais (Barras Horizontais)"""
    print("Gerando: Eficiência dos Canais...") 
    
    plt.figure(figsize=(12, 8))
    canais_eficiencia = canais_clean.nlargest(15, 'Eficiencia').sort_values('Eficiencia', ascending=True)
    
    colors = ['green' if x > 1.0 else 'orange' for x in canais_eficiencia['Eficiencia']]
    bars = plt.barh(range(len(canais_eficiencia)), canais_eficiencia['Eficiencia'], color=colors, alpha=0.8)
    
    plt.yticks(range(len(canais_eficiencia)), 
               [canal[:30] + '...' if len(canal) > 30 else canal for canal in canais_eficiencia['Canal']])
    plt.xlabel('Índice de Eficiência', fontsize=12)
    plt.title('Eficiência dos Canais (Receita/Pedidos)', fontsize=16, fontweight='bold', pad=20)
    plt.axvline(x=1.0, color='red', linestyle='--', alpha=0.7, label='Eficiência Neutra')
    plt.legend()
    
    # Adicionar valores nas barras
    for i, (bar, value) in enumerate(zip(bars, canais_eficiencia['Eficiencia'])):
        plt.text(value + 0.02, i, f'{value:.2f}', va='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '12_eficiencia_canais.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_13_ticket_medio_canais(canais_clean):
    """Gráfico 13: Ticket Médio por Canais (Barras Horizontais)"""
    print("Gerando: Ticket Médio por Canais...")
    
    plt.figure(figsize=(12, 8))
    canais_ticket = canais_clean.nlargest(15, 'Ticket_Medio').sort_values('Ticket_Medio', ascending=True)
    
    bars = plt.barh(range(len(canais_ticket)), canais_ticket['Ticket_Medio'], 
                   color='purple', alpha=0.8)
    plt.yticks(range(len(canais_ticket)), 
               [canal[:30] + '...' if len(canal) > 30 else canal for canal in canais_ticket['Canal']])
    plt.xlabel('Ticket Médio (R$)', fontsize=12)
    plt.title('Ticket Médio por Canais', fontsize=16, fontweight='bold', pad=20)
    
    # Adicionar valores nas barras
    for i, (bar, value) in enumerate(zip(bars, canais_ticket['Ticket_Medio'])):
        plt.text(value + 10, i, f'R$ {value:.0f}', va='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '13_ticket_medio_canais.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_14_concentracao_canais(canais_clean):
    """Gráfico 14: Concentração de Receita por Canal (Pizza)"""
    print("Gerando: Concentração de Receita por Canal...")
    
    plt.figure(figsize=(12, 8))
    
    # Pegar top 5 canais e agrupar o resto em "Outros"
    top5_canais = canais_clean.nlargest(5, 'Total_Vendas')
    outros_receita = canais_clean.nsmallest(len(canais_clean) - 5, 'Total_Vendas')['Total_Vendas'].sum()
    
    # Criar dados para o gráfico
    receita_data = list(top5_canais['Total_Vendas']) + [outros_receita]
    labels_data = list(top5_canais['Canal']) + ['Outros']
    
    colors = plt.cm.Set2(np.linspace(0, 1, len(labels_data)))
    
    wedges, texts, autotexts = plt.pie(receita_data, 
                                      labels=[label[:20] + '...' if len(label) > 20 else label for label in labels_data], 
                                      autopct='%1.1f%%', 
                                      colors=colors, 
                                      startangle=90)
    
    plt.title('Concentração de Receita por Canal', fontsize=16, fontweight='bold', pad=20)
    
    # Adicionar legenda com valores
    legend_labels = [f'{label}: R$ {val:,.0f}' for label, val in zip(labels_data, receita_data)]
    plt.legend(wedges, legend_labels, title="Canais", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1))
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '14_concentracao_canais.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_15_scatter_canais(canais_clean):
    """Gráfico 15: Relação Pedidos vs Receita por Canal"""
    print("Gerando: Relação Pedidos vs Receita por Canal...")
    
    plt.figure(figsize=(12, 8))
    scatter = plt.scatter(canais_clean['Num_Pedidos'], canais_clean['Total_Vendas'], 
                         alpha=0.7, s=100, c=canais_clean['Eficiencia'], cmap='RdYlGn')
    plt.xlabel('Número de Pedidos', fontsize=12)
    plt.ylabel('Receita (R$)', fontsize=12)
    plt.title('Relação Pedidos vs Receita por Canal (cor = eficiência)', fontsize=16, fontweight='bold', pad=20)
    
    # Adicionar colorbar
    cbar = plt.colorbar(scatter)
    cbar.set_label('Eficiência')
    
    # Destacar canais principais
    for idx, row in canais_clean.nlargest(5, 'Total_Vendas').iterrows():
        plt.annotate(row['Canal'][:15], 
                    (row['Num_Pedidos'], row['Total_Vendas']),
                    xytext=(5, 5), textcoords='offset points', fontsize=8)
    
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '15_scatter_canais.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_16_distribuicao_pedidos_canais(canais_clean):
    """Gráfico 16: Distribuição de Pedidos por Canal"""
    print("Gerando: Distribuição de Pedidos por Canal...")
    
    plt.figure(figsize=(12, 8))
    plt.hist(canais_clean['Num_Pedidos'], bins=15, alpha=0.7, color='lightblue', edgecolor='black')
    plt.axvline(canais_clean['Num_Pedidos'].mean(), color='red', linestyle='--', 
               label=f'Média: {canais_clean["Num_Pedidos"].mean():.1f}')
    plt.axvline(canais_clean['Num_Pedidos'].median(), color='blue', linestyle='--', 
               label=f'Mediana: {canais_clean["Num_Pedidos"].median():.1f}')
    plt.xlabel('Número de Pedidos', fontsize=12)
    plt.ylabel('Número de Canais', fontsize=12)
    plt.title('Distribuição de Pedidos por Canal', fontsize=16, fontweight='bold', pad=20)
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '16_distribuicao_pedidos_canais.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_17_heatmap_canais(canais_clean):
    """Gráfico 17: Heatmap de Performance dos Canais"""
    print("Gerando: Heatmap de Performance dos Canais...")
    
    plt.figure(figsize=(12, 10))
    
    # Normalizar dados para o heatmap
    top15_canais = canais_clean.nlargest(15, 'Total_Vendas')
    
    # Preparar dados normalizados
    dados_norm = top15_canais[['Num_Pedidos', 'Total_Vendas', 'Ticket_Medio', 'Eficiencia']].copy()
    
    # Normalizar cada coluna (0-1)
    for col in dados_norm.columns:
        dados_norm[col] = (dados_norm[col] - dados_norm[col].min()) / (dados_norm[col].max() - dados_norm[col].min())
    
    dados_norm.index = [canal[:20] + '...' if len(canal) > 20 else canal for canal in top15_canais['Canal']]
    dados_norm.columns = ['Pedidos', 'Vendas', 'Ticket Médio', 'Eficiência']
    
    # Criar heatmap
    sns.heatmap(dados_norm, annot=True, cmap='RdYlGn', center=0.5, 
                square=False, fmt='.2f', cbar_kws={'label': 'Performance Normalizada'})
    plt.title('Heatmap de Performance dos Canais (Top 15)', fontsize=16, fontweight='bold', pad=20)
    plt.ylabel('Canais', fontsize=12)
    plt.xlabel('Métricas', fontsize=12)
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '17_heatmap_canais.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def gerar_grafico_18_dashboard_canais(canais_clean):
    """Gráfico 18: Dashboard Resumo dos Canais"""
    print("Gerando: Dashboard Resumo dos Canais...")
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(20, 16))
    
    # Gráfico 1: Top 8 canais por receita
    top8_canais = canais_clean.nlargest(8, 'Total_Vendas')
    bars1 = ax1.barh(range(len(top8_canais)), top8_canais['Total_Vendas'], color='steelblue')
    ax1.set_yticks(range(len(top8_canais)))
    ax1.set_yticklabels([canal[:25] + '...' if len(canal) > 25 else canal for canal in top8_canais['Canal']])
    ax1.set_xlabel('Receita (R$)')
    ax1.set_title('Top 8 Canais por Receita', fontsize=14, fontweight='bold')
    ax1.invert_yaxis()
    
    # Adicionar valores
    for i, (bar, value) in enumerate(zip(bars1, top8_canais['Total_Vendas'])):
        ax1.text(value + 500, i, f'R$ {value:,.0f}', va='center', fontsize=9)
    
    # Gráfico 2: Eficiência dos canais
    canais_ef = canais_clean.nlargest(10, 'Eficiencia')
    colors = ['green' if x > 1.0 else 'orange' for x in canais_ef['Eficiencia']]
    bars2 = ax2.bar(range(len(canais_ef)), canais_ef['Eficiencia'], color=colors, alpha=0.8)
    ax2.set_xticks(range(len(canais_ef)))
    ax2.set_xticklabels([canal[:10] + '...' if len(canal) > 10 else canal for canal in canais_ef['Canal']], 
                       rotation=45, ha='right')
    ax2.set_ylabel('Eficiência')
    ax2.set_title('Eficiência dos Canais', fontsize=14, fontweight='bold')
    ax2.axhline(y=1.0, color='red', linestyle='--', alpha=0.7, label='Neutra')
    ax2.legend()
    
    # Gráfico 3: Distribuição ticket médio
    ax3.hist(canais_clean['Ticket_Medio'], bins=12, alpha=0.7, color='lightcoral', edgecolor='black')
    ax3.axvline(canais_clean['Ticket_Medio'].mean(), color='red', linestyle='--', 
               label=f'Média: R$ {canais_clean["Ticket_Medio"].mean():.0f}')
    ax3.set_xlabel('Ticket Médio (R$)')
    ax3.set_ylabel('Número de Canais')
    ax3.set_title('Distribuição do Ticket Médio', fontsize=14, fontweight='bold')
    ax3.legend()
    
    # Gráfico 4: Scatter eficiência vs volume
    scatter = ax4.scatter(canais_clean['Num_Pedidos'], canais_clean['Eficiencia'], 
                         alpha=0.7, s=80, c=canais_clean['Total_Vendas'], cmap='viridis')
    ax4.set_xlabel('Número de Pedidos')
    ax4.set_ylabel('Eficiência')
    ax4.set_title('Eficiência vs Volume (cor = receita)', fontsize=14, fontweight='bold')
    ax4.axhline(y=1.0, color='red', linestyle='--', alpha=0.5)
    
    # Colorbar
    cbar = plt.colorbar(scatter, ax=ax4)
    cbar.set_label('Receita (R$)')
    
    plt.tight_layout()
    plt.savefig(os.path.join(PASTA_GRAFICOS, '18_dashboard_canais.jpg'), 
                format='jpg', dpi=300, bbox_inches='tight')
    plt.close()

def main():
    """Função principal"""
    print("Iniciando geração de gráficos completos...")
    
    # Carregar dados
    produtos_clean, canais_clean = carregar_dados()
    
    if produtos_clean is None or canais_clean is None:
        print("❌ Erro: Não foi possível carregar os dados")
        return
    
    print(f"\n📊 Gerando gráficos para {len(produtos_clean)} produtos e {len(canais_clean)} canais...")
    print("="*50)

def main():
    """Função principal"""
    print("Iniciando geração de gráficos completos...")
    
    # Carregar dados
    produtos_clean, canais_clean = carregar_dados()
    
    if produtos_clean is None or canais_clean is None:
        print("❌ Erro: Não foi possível carregar os dados")
        return
    
    # Mostrar produtos por categoria para verificação
    mostrar_produtos_por_categoria(produtos_clean)
    
    print(f"\n📊 Gerando gráficos para {len(produtos_clean)} produtos e {len(canais_clean)} canais...")
    print("="*50)
    
    # Gerar gráficos principais
    try:
        gerar_grafico_comparacao_categorizacao(produtos_clean)
        gerar_grafico_1_top_produtos(produtos_clean)
        gerar_grafico_2_receita_categoria(produtos_clean)
        gerar_grafico_3_distribuicao_pedidos(produtos_clean)
        gerar_grafico_4_scatter_pedidos_receita(produtos_clean)
        gerar_grafico_5_pareto_produtos(produtos_clean)
        gerar_grafico_6_matriz_segmentacao(produtos_clean)
        gerar_grafico_7_ticket_medio_categoria(produtos_clean)
        gerar_grafico_8_concentracao_receita(produtos_clean)
        gerar_grafico_9_correlacoes(produtos_clean)
        gerar_grafico_10_receita_crescimento(produtos_clean)
        
        # Gráficos de canais
        gerar_grafico_11_top_canais_receita(canais_clean)
        gerar_grafico_12_eficiencia_canais(canais_clean)
        gerar_grafico_13_ticket_medio_canais(canais_clean)
        gerar_grafico_14_concentracao_canais(canais_clean)
        gerar_grafico_15_scatter_canais(canais_clean)
        gerar_grafico_16_distribuicao_pedidos_canais(canais_clean)
        gerar_grafico_17_heatmap_canais(canais_clean)
        gerar_grafico_18_dashboard_canais(canais_clean)
        
        print("="*50)
        print("✅ GRÁFICOS CORRIGIDOS GERADOS COM SUCESSO!")
        print(f"📁 Localização: {PASTA_GRAFICOS}")
        print("\n🔧 CORREÇÃO APLICADA:")
        print("   • Produtos COMBO agora são categorizados corretamente")
        print("   • Categoria ÔMEGA agora mostra valores precisos")
        print("   • Gráfico de comparação mostra antes/depois")
        
    except Exception as e:
        print(f"❌ Erro durante a geração: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()